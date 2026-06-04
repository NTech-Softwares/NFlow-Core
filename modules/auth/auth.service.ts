import bcrypt from "bcryptjs";
import crypto from "crypto"; // 🚀 Nativo do Node para gerar UUIDs reais
import jwt from "jsonwebtoken";
import { logger } from "../../shared/utils/logger";
import { dbClient } from "../../shared/database";

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  whatsappSessionId: string;
  createdAt?: string;
}

/**
 * Valida as credenciais do usuário lendo diretamente da tabela users do Postgres
 */
export async function validateUser(email: string, password: string) {
  const query = `SELECT id, name, email, password_hash, whatsapp_session_id FROM users WHERE LOWER(email) = $1 LIMIT 1`;

  try {
    const res = await dbClient.query(query, [email.toLowerCase().trim()]);

    if (res.length === 0) {
      logger.warn(`Tentativa de login falhou: Email não encontrado (${email})`);
      return null;
    }

    const user = res[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      logger.warn(
        `Tentativa de login falhou: Senha Incorreta para o email (${email})`,
      );
      return null;
    }

    logger.info(`Usuário [${user.name}] Autenticado com sucesso.`);

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      whatsappSessionId: user.whatsapp_session_id,
    };
  } catch (error: any) {
    logger.error(`Erro crítico na validação de usuário: ${error.message}`);
    return null;
  }
}

/**
 * Registra um novo usuário com UUID seguro e previne duplicidade de e-mail
 */
export async function registerNewUser(
  name: string,
  email: string,
  passwordRaw: string,
  extraConfig: {
    phone?: string;
    timezone?: string;
    businessHoursEnabled?: boolean;
    businessHours?: { start: string; end: string };
  },
) {
  const normalizedEmail = email.toLowerCase().trim();

  // 1. Defesa ativa: Impede emails duplicados de passarem
  const checkQuery = `SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1`;
  const checkRes = await dbClient.query(checkQuery, [normalizedEmail]);

  if (checkRes.length > 0) {
    throw new Error("Este e-mail já está cadastrado no sistema.");
  }

  // 2. Geração de IDs Limpos e Imutáveis baseados em UUIDv4
  const finalId = crypto.randomUUID();
  const whatsappSessionId = `sess_${finalId}`;

  // 3. Criptografa a senha
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(passwordRaw, salt);

  // 4. Monta o objeto de configuração JSONB
  const completeScheduleJson = JSON.stringify({
    enabled: extraConfig.businessHoursEnabled ?? true,
    startTime: extraConfig.businessHours?.start || "08:00",
    endTime: extraConfig.businessHours?.end || "18:00",
    timezone: extraConfig.timezone || "America/Fortaleza",
    masterPhone: extraConfig.phone || "",
  });

  // ⚡ INÍCIO DO FLUXO DE TRANSAÇÃO CRÍTICA
  try {
    // Abrimos uma transação para garantir atomicidade total
    await dbClient.query("BEGIN");

    // 5. Salva na tabela users
    const insertUserQuery = `
      INSERT INTO users 
        (id, name, email, password_hash, whatsapp_session_id, business_hours_schedule, created_at)
      VALUES 
        ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
    `;
    await dbClient.query(insertUserQuery, [
      finalId,
      name.trim(),
      normalizedEmail,
      passwordHash,
      whatsappSessionId,
      completeScheduleJson,
    ]);
    logger.info(`[Transaction] Passo 1/2: Usuário inserido temporariamente.`);

    // 6. Provisiona o status inicial para o Baileys escutar a sessão
    const insertSessionStatusQuery = `
      INSERT INTO whatsapp_session_status (session_id, status, qr_code, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (session_id) DO NOTHING;
    `;
    await dbClient.query(insertSessionStatusQuery, [
      whatsappSessionId,
      "DISCONNECTED",
      null,
    ]);
    logger.info(
      `[Transaction] Passo 2/2: Status da sessão provisionado temporariamente.`,
    );

    // Se as duas queries rodaram sem erros, salvamos definitivamente no banco
    await dbClient.query("COMMIT");
    logger.info(`[Transaction] Sucesso! COMMIT executado no banco.`);

    logger.info(
      `Novo usuário e ambiente do WhatsApp registrados: ${normalizedEmail} (ID: ${finalId})`,
    );

    return {
      id: finalId,
      name: name.trim(),
      email: normalizedEmail,
      whatsappSessionId,
    };
  } catch (transactionError: any) {
    // Caso QUALQUER uma das duas inserts falhe, desfazemos tudo para não gerar lixo no banco
    await dbClient.query("ROLLBACK");

    // 🚨 LOG DE OURO: Isso vai printar o erro exato do Postgres se a tabela de sessão falhar
    logger.error(
      `[Auth DB Error] Falha crítica na transação de cadastro. Efetuado ROLLBACK! Motivo: ${transactionError.message}`,
    );

    throw new Error(
      `Erro ao configurar tabelas de autenticação: ${transactionError.message}`,
    );
  }
}

/**
 * 🔑 Gera um token seguro temporário de 15 minutos para recuperação de senha
 */
export async function generateResetToken(email: string) {
  const normalizedEmail = email.toLowerCase().trim();
  const query = `SELECT id, name FROM users WHERE LOWER(email) = $1 LIMIT 1`;
  const res = await dbClient.query(query, [normalizedEmail]);

  if (res.length === 0) {
    throw new Error("Nenhuma conta encontrada com este e-mail.");
  }

  const user = res[0];

  // Token assinado que expira sozinho em 15 minutos
  const resetToken = jwt.sign(
    { id: user.id, purpose: "password_reset" },
    process.env.JWT_SECRET as string,
    { expiresIn: "15m" },
  );

  return { resetToken, user };
}

/**
 * 🔄 Consome o token, valida e atualiza a senha definitiva do usuário
 */
export async function resetUserPassword(token: string, passwordRaw: string) {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
      purpose: string;
    };

    if (decoded.purpose !== "password_reset") {
      throw new Error("Token de recuperação inválido para este propósito.");
    }

    const salt = await bcrypt.genSalt(10);
    const newPasswordHash = await bcrypt.hash(passwordRaw, salt);

    const updateQuery = `UPDATE users SET password_hash = $1 WHERE id = $2`;
    await dbClient.query(updateQuery, [newPasswordHash, decoded.id]);

    logger.info(
      `[Auth] Senha atualizada via recovery com sucesso para o User ID: ${decoded.id}`,
    );
    return true;
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      throw new Error("O link de recuperação expirou. Solicite um novo link.");
    }
    throw new Error("Link de recuperação inválido ou corrompido.");
  }
}
