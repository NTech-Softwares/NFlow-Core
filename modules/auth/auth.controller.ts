import { Request, Response } from "express";
import jwt from "jsonwebtoken";
import {
  validateUser,
  registerNewUser,
  generateResetToken,
  resetUserPassword,
} from "./auth.service";
import { logger } from "../../shared/utils/logger";
import { UserService } from "../users/users.service";

const userService = new UserService();

export async function me(req: Request, res: Response) {
  return res.json((req as any).user);
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email e senha são obrigatórios." });
  }

  const user = await validateUser(email, password);

  if (!user) {
    logger.error("Tentativa de conexão: Credenciais Inválidas");
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign(
    {
      id: user.id,
      email: user.email,
      whatsappSessionId: user.whatsappSessionId,
    },
    process.env.JWT_SECRET as string,
    { expiresIn: "7h" },
  );

  logger.info(
    `Token Assinado com sucesso para o ID: ${user.id} (Sessão: ${user.whatsappSessionId})`,
  );

  return res.json({ token, user });
}

export async function register(req: Request, res: Response) {
  const {
    name,
    email,
    password,
    phone,
    timezone,
    businessHoursEnabled,
    businessHours,
  } = req.body;

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ error: "Todos os campos bases são obrigatórios." });
  }

  try {
    const newUser = await registerNewUser(name, email, password, {
      phone,
      timezone,
      businessHoursEnabled,
      businessHours,
    });

    // 🚀 CORRIGIDO: Passando o ID do usuário E o ID real da sessão do WhatsApp
    if (newUser && newUser.id) {
      await userService.provisionNewTenantSpace(
        newUser.id,
        newUser.whatsappSessionId,
      );
    }

    return res.status(201).json({
      message: "Usuário criado com sucesso!",
      user: newUser,
    });
  } catch (error: any) {
    logger.error(`Falha ao registrar usuário: ${error.message}`);
    return res.status(400).json({ error: error.message });
  }
}

export async function forgotPassword(req: Request, res: Response) {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: "O campo de e-mail é obrigatório." });
  }

  try {
    const { resetToken, user } = await generateResetToken(email);
    const resetLink = `${process.env.DASHBOARD_URL || "http://localhost:3000"}/reset-password.html?token=${resetToken}`;

    logger.info(`[RECOVERY LINK FOR ${user.name}]: ${resetLink}`);

    return res.json({
      message:
        "Se este e-mail estiver cadastrado, um link de recuperação foi enviado para a caixa de entrada.",
      developmentLink: resetLink,
    });
  } catch (error: any) {
    return res.status(200).json({
      message:
        "Se este e-mail estiver cadastrado, um link de recuperação foi enviado para a caixa de entrada.",
    });
  }
}

export async function resetPassword(req: Request, res: Response) {
  const { token, password } = req.body;

  if (!token || !password) {
    return res
      .status(400)
      .json({ error: "Token e nova senha são obrigatórios." });
  }

  try {
    await resetUserPassword(token, password);
    return res.json({
      message: "Senha atualizada com sucesso! Você já pode fazer login.",
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}
