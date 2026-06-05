import makeWASocket, {
  Browsers,
  DisconnectReason,
  fetchLatestWaWebVersion,
  WASocket,
  makeCacheableSignalKeyStore,
} from "@whiskeysockets/baileys";
import { pino } from "pino";
import qrcode from "qrcode-terminal";
import { Boom } from "@hapi/boom";
import { logger } from "../../../shared/utils/logger";
import { getMessage } from "../../../shared/utils/message";
import { dbClient } from "../../../shared/database";
// 🔄 ATUALIZADO: Importando a função de limpeza que criamos
import { usePostgresAuthState, clearPostgresAuthState } from "./baileysDbAuth";
import MessageHandler from "./handlers/message.handler";

interface SessionControl {
  sock: WASocket;
  status: "DISCONNECTED" | "CONNECTING" | "QRCODE" | "CONNECTED";
  qr: string | null;
  reconnectAttempts: number;
  isStarting: boolean;
}

const activeSessions = new Map<string, SessionControl>();
const MAX_RECONNECT_ATTEMPTS = 5;
const USE_LATEST_VERSION = true;

// Função auxiliar interna para atualizar o status na memória e no Postgres de forma síncrona/transparente
async function updateSessionStatusTable(
  sessionId: string,
  status: SessionControl["status"],
  qr: string | null = null,
) {
  try {
    await dbClient.query(
      `
      INSERT INTO whatsapp_session_status (session_id, status, qr_code, updated_at)
      VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
      ON CONFLICT (session_id) 
      DO UPDATE SET status = EXCLUDED.status, qr_code = EXCLUDED.qr_code, updated_at = CURRENT_TIMESTAMP
    `,
      [sessionId, status, qr],
    );
  } catch (err) {
    logger.error(
      `[Sessão: ${sessionId}] Erro ao espelhar status no banco:`,
      err,
    );
  }
}

export const startWhatsapp = async (sessionId: string): Promise<WASocket> => {
  const existingSession = activeSessions.get(sessionId);
  if (
    existingSession &&
    (existingSession.isStarting || existingSession.status === "CONNECTED")
  ) {
    return existingSession.sock;
  }

  if (!activeSessions.has(sessionId)) {
    activeSessions.set(sessionId, {
      sock: null as any,
      status: "DISCONNECTED",
      qr: null,
      reconnectAttempts: 0,
      isStarting: true,
    });
  } else {
    activeSessions.get(sessionId)!.isStarting = true;
  }

  const currentControl = activeSessions.get(sessionId)!;

  try {
    const { state, saveCreds } = await usePostgresAuthState(sessionId);
    const { version, isLatest } = await fetchLatestWaWebVersion({});

    if (USE_LATEST_VERSION) {
      logger.info(
        `[Sessão: ${sessionId}] Versão WaWeb: ${version.join(".")} | ${isLatest ? "Mais recente" : "Desatualizada"}`,
      );
    }

    const authWithCache = {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "silent" })),
    };

    const sock = makeWASocket({
      auth: authWithCache,
      browser: Browsers.appropriate("Desktop"),
      printQRInTerminal: false,
      version: USE_LATEST_VERSION ? version : undefined,
      defaultQueryTimeoutMs: 60000,
      logger: pino({ level: "silent" }),
      generateHighQualityLinkPreview: false,
    });

    currentControl.sock = sock;

    sock.ev.on(
      "connection.update",
      async ({ connection, lastDisconnect, qr }: any) => {
        logger.info(
          `[Sessão: ${sessionId}] Update: ${connection || ""} ${lastDisconnect || ""}`,
        );

        if (qr) {
          currentControl.status = "QRCODE";
          currentControl.qr = qr;
          await updateSessionStatusTable(sessionId, "QRCODE", qr);

          console.log(`\n--- QR CODE DO CLIENTE: ${sessionId} ---`);
          qrcode.generate(qr, { small: true });
        }

        if (connection === "connecting") {
          currentControl.status = "CONNECTING";
          await updateSessionStatusTable(sessionId, "CONNECTING");
        }

        if (connection === "open") {
          currentControl.status = "CONNECTED";
          currentControl.qr = null;
          currentControl.reconnectAttempts = 0;
          currentControl.isStarting = false;
          await updateSessionStatusTable(sessionId, "CONNECTED");
          logger.info(`[Sessão: ${sessionId}] Bot Conectado com Sucesso!`);
        }

        if (connection === "close") {
          currentControl.status = "DISCONNECTED";
          logger.error(`[Sessão: ${sessionId}] Conexão fechada.`);

          const statusCode = (lastDisconnect?.error as Boom)?.output
            ?.statusCode;

          // 🔄 ATUALIZADO: Tratando 401 e 403 como deslogado para evitar loop infinito
          const shouldReconnect =
            statusCode !== DisconnectReason.loggedOut &&
            statusCode !== 401 &&
            statusCode !== 403;

          if (shouldReconnect) {
            currentControl.reconnectAttempts++;
            await updateSessionStatusTable(sessionId, "DISCONNECTED");

            if (currentControl.reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
              logger.error(
                `[Sessão: ${sessionId}] Limite máximo de reconexões atingido.`,
              );
              currentControl.isStarting = false;
              return;
            }

            logger.warn(
              `[Sessão: ${sessionId}] Tentando reconectar (${currentControl.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) em 5s...`,
            );

            setTimeout(() => {
              currentControl.isStarting = false;
              startWhatsapp(sessionId);
            }, 5000);
          } else {
            // TRATAMENTO DE LOGOUT PERMANENTE OU CHAVES CORROMPIDAS
            logger.warn(
              `[Sessão: ${sessionId}] Desconectado permanentemente (Logout/Credenciais Inválidas). Limpando dados do Banco...`,
            );

            try {
              // 🔄 ATUALIZADO: Usando a função modular para limpar as credenciais velhas
              await clearPostgresAuthState(sessionId);
              await updateSessionStatusTable(sessionId, "DISCONNECTED", null);
            } catch (err) {
              logger.error(
                `[Sessão: ${sessionId}] Erro ao remover credenciais do banco:`,
                err,
              );
            }

            currentControl.reconnectAttempts = 0;
            currentControl.isStarting = false;
            currentControl.qr = null;
            activeSessions.delete(sessionId);

            // Gera uma nova tentativa de conexão (que agora vai gerar um QR Code novo, pois o banco está limpo)
            setTimeout(() => {
              startWhatsapp(sessionId);
            }, 2000);
          }
        }
      },
    );

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      if (type !== "notify" && type !== "append") return;

      for (const message of messages) {
        try {
          if (!message.message) continue;

          const jid = message.key.remoteJid;
          if (!jid || jid.endsWith("@g.us") || jid === "status@broadcast")
            continue;
          if (message.messageStubType || message.message.protocolMessage)
            continue;
          if (
            message.message.reactionMessage ||
            message.message.pollUpdateMessage
          )
            continue;

          const formattedMessage = getMessage(message, sock);
          if (!formattedMessage || !formattedMessage.content) continue;

          logger.info(
            `[Sessão: ${sessionId}] Mensagem Recebida | De: ${formattedMessage.pushName || "User"} | deMim? ${formattedMessage.fromMe}`,
          );

          await MessageHandler(formattedMessage, sessionId);
        } catch (error) {
          logger.error(
            `[Sessão: ${sessionId}] Erro ao processar mensagem: ${error}`,
          );
        }
      }
    });

    sock.ev.on("creds.update", saveCreds);
    return sock;
  } catch (error) {
    currentControl.isStarting = false;
    logger.error(`[Sessão: ${sessionId}] Erro fatal de inicialização:`, error);
    throw error;
  }
};

export function getWhatsapp(sessionId: string): WASocket {
  const session = activeSessions.get(sessionId);
  if (!session || !session.sock) {
    throw new Error(`WhatsApp não iniciado para a sessão: ${sessionId}`);
  }
  return session.sock;
}

export function getSessionStatus(sessionId: string) {
  const session = activeSessions.get(sessionId);
  if (!session) {
    return { status: "DISCONNECTED", qr: null };
  }
  return {
    status: session.status,
    qr: session.qr,
  };
}
