import makeWASocket, {
  Browsers,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestWaWebVersion,
  WASocket,
} from "@whiskeysockets/baileys";
import { pino } from "pino";
import qrcode from "qrcode-terminal";
import { Boom } from "@hapi/boom";
import fs from "fs";
import path from "path";
import { logger } from "../../../shared/utils/logger";
import { getMessage } from "../../../shared/utils/message";
import MessageHandler from "./handlers/message.handler";

// Interfaces para controle interno por instância
interface SessionControl {
  sock: WASocket;
  status: "DISCONNECTED" | "CONNECTING" | "QRCODE" | "CONNECTED";
  qr: string | null;
  reconnectAttempts: number;
  isStarting: boolean;
}

// 🎯 O CORAÇÃO DO MULTI-TENANT: Armazena as sessões ativas isoladas na memória do Node.js
const activeSessions = new Map<string, SessionControl>();

const MAX_RECONNECT_ATTEMPTS = 5;
const USE_LATEST_VERSION = true;

/**
 * Inicializa ou retorna a sessão do WhatsApp de um usuário específico
 * @param sessionId O whatsappSessionId vindo do banco/JSON do usuário
 */
export const startWhatsapp = async (sessionId: string): Promise<WASocket> => {
  // Se a sessão já existe, está conectada ou tentando conectar, reaproveita a instância
  const existingSession = activeSessions.get(sessionId);
  if (
    existingSession &&
    (existingSession.isStarting || existingSession.status === "CONNECTED")
  ) {
    return existingSession.sock;
  }

  // Define o caminho dinâmico e isolado da pasta de autenticação do cliente
  const authFolder = path.join(process.cwd(), "auth", "sessions", sessionId);

  // Inicializa ou recupera o objeto de controle da sessão específica no Map
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
    const { state, saveCreds } = await useMultiFileAuthState(authFolder);
    const { version, isLatest } = await fetchLatestWaWebVersion({});

    if (USE_LATEST_VERSION) {
      logger.info(
        `[Sessão: ${sessionId}] Versão WaWeb: ${version.join(".")} | ${
          isLatest ? "Mais recente" : "Desatualizada"
        }`,
      );
    }

    const sock = makeWASocket({
      auth: state,
      browser: Browsers.appropriate("Desktop"),
      printQRInTerminal: false,
      version: USE_LATEST_VERSION ? version : undefined,
      defaultQueryTimeoutMs: 60000,
      logger: pino({ level: "silent" }), // Evita flooding de logs no terminal
      generateHighQualityLinkPreview: false,
    });

    // Vincula o socket criado ao controle da sessão do cliente
    currentControl.sock = sock;

    // Escuta atualizações de conexão
    sock.ev.on(
      "connection.update",
      async ({ connection, lastDisconnect, qr }: any) => {
        logger.info(
          `[Sessão: ${sessionId}] Update: ${connection || ""} ${lastDisconnect || ""}`,
        );

        if (qr) {
          currentControl.status = "QRCODE";
          currentControl.qr = qr;

          // Exibe o QR do cliente específico no terminal para debug local
          console.log(`\n--- QR CODE DO CLIENTE: ${sessionId} ---`);
          qrcode.generate(qr, { small: true });
        }

        if (connection === "connecting") {
          currentControl.status = "CONNECTING";
        }

        if (connection === "open") {
          currentControl.status = "CONNECTED";
          currentControl.qr = null;
          currentControl.reconnectAttempts = 0;
          currentControl.isStarting = false;
          logger.info(`[Sessão: ${sessionId}] Bot Conectado com Sucesso!`);
        }

        if (connection === "close") {
          currentControl.status = "DISCONNECTED";
          logger.error(`[Sessão: ${sessionId}] Conexão fechada.`);

          const statusCode = (lastDisconnect?.error as Boom)?.output
            ?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          if (shouldReconnect) {
            currentControl.reconnectAttempts++;

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
            // TRATAMENTO DE LOGOUT PERMANENTE DO CLIENTE ESPECÍFICO
            logger.warn(
              `[Sessão: ${sessionId}] Desconectado permanentemente. Limpando diretório local...`,
            );

            try {
              if (fs.existsSync(authFolder)) {
                fs.rmSync(authFolder, { recursive: true, force: true });
                logger.info(
                  `[Sessão: ${sessionId}] Pasta de credenciais limpa.`,
                );
              }
            } catch (err) {
              logger.error(
                `[Sessão: ${sessionId}] Erro ao remover pasta de autenticação:`,
                err,
              );
            }

            currentControl.reconnectAttempts = 0;
            currentControl.isStarting = false;
            currentControl.qr = null;
            activeSessions.delete(sessionId); // Remove do Map para reset total

            setTimeout(() => {
              startWhatsapp(sessionId);
            }, 2000);
          }
        }
      },
    );

    // Escuta novas mensagens recebidas por esta instância
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

          // O seu getMessage já recebe o 'sock' perfeitamente aqui:
          const formattedMessage = getMessage(message, sock);
          if (!formattedMessage || !formattedMessage.content) continue;

          // Log incremental para você acompanhar o comportamento no terminal
          logger.info(
            `[Sessão: ${sessionId}] Mensagem processada | De: ${formattedMessage.pushName || "User"} | deMim? ${formattedMessage.fromMe}`,
          );

          // 💡 IMPORTANTE: Passamos o sessionId para o Handler saber qual fluxo de qual cliente rodar!
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

/**
 * Recupera a instância do socket de um usuário ativo na memória
 */
export function getWhatsapp(sessionId: string): WASocket {
  const session = activeSessions.get(sessionId);
  if (!session || !session.sock) {
    throw new Error(`WhatsApp não iniciado para a sessão: ${sessionId}`);
  }
  return session.sock;
}

/**
 * Retorna o status atualizado de uma sessão específica para a API
 */
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
