import P, { pino } from "pino";
import makeWASocket, {
  Browsers,
  useMultiFileAuthState,
  DisconnectReason,
  WAMessage,
  fetchLatestWaWebVersion,
  WASocket,
} from "@whiskeysockets/baileys";
import qrcode from "qrcode-terminal";
import { Boom } from "@hapi/boom";
import { logger } from "../../../shared/utils/logger";
import { getMessage } from "../../../shared/utils/message";
import MessageHandler from "./handlers/messageHandler";
import { sessionState } from "./state/connectionState";

const CONNECTION_TYPE = "QR"; // "NUMBER" (se quiser usar o número para login)
const PHONE_NUMBER = "556892000000"; // +55 (68) 9200-0000 -> 556892000000 (formato para número)
const USE_LASTEST_VERSION = true;

let sock: WASocket | null = null;

let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
let isStarting = false;

export const startWhatsapp = async (): Promise<WASocket> => {
  if (isStarting && sock) {
    return sock;
  }

  isStarting = true;

  try {
    const { state, saveCreds } = await useMultiFileAuthState("auth");
    const { version, isLatest } = await fetchLatestWaWebVersion({});
    if (USE_LASTEST_VERSION) {
      logger.info(
        `Versão atual do WaWeb: ${version.join(".")} | ${
          isLatest ? "Versão mais recente" : "Está desatualizado"
        }`,
      );
    }

    // @ts-ignore
    sock = makeWASocket({
      auth: state,
      browser:
        // @ts-ignore
        CONNECTION_TYPE === "NUMBER"
          ? Browsers.ubuntu("Chrome")
          : Browsers.appropriate("Desktop"),
      printQRInTerminal: false,
      version: USE_LASTEST_VERSION ? version : undefined,
      defaultQueryTimeoutMs: 60000,
      //Torna o Baileys Silencioso - Menos logs
      logger: pino({ level: "silent" }),
      generateHighQualityLinkPreview: false,
    });

    // @ts-ignore
    if (CONNECTION_TYPE === "NUMBER" && !sock.authState.creds.registered) {
      try {
        setTimeout(async () => {
          if (sock) {
            const code = await sock.requestPairingCode(PHONE_NUMBER);
            logger.info(
              `\n========================================\n\nCódigo de Pareamento: \n\n  ${code}\n\n========================================`,
            );
          }
        }, 1000);
      } catch (error) {
        logger.error("Erro ao obter o código de pareamento.");
      }
    }

    sock.ev.on(
      "connection.update",
      async ({ connection, lastDisconnect, qr }: any) => {
        logger.info(
          `Socket Connection Update: ${connection || ""} ${lastDisconnect || ""}`,
        );

        if (qr) {
          sessionState.status = "QRCODE";
          sessionState.qr = qr;
          if (CONNECTION_TYPE === "QR") {
            qrcode.generate(qr, { small: true });
          }
        }

        if (connection === "connecting") {
          sessionState.status = "CONNECTING";
        }

        if (connection === "open") {
          sessionState.status = "CONNECTED";
          sessionState.qr = null;
          reconnectAttempts = 0;
          isStarting = false; // Permite novas inicializações futuras se cair
          logger.info("Bot Conectado com Sucesso!");
        }

        if (connection === "close") {
          sessionState.status = "DISCONNECTED";
          logger.error("Conexão fechada");

          const statusCode = (lastDisconnect?.error as Boom)?.output
            ?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          if (shouldReconnect) {
            reconnectAttempts++;

            if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
              logger.error(
                "Máximo de tentativas de reconexão atingido. Pare a aplicação.",
              );
              isStarting = false;
              return;
            }

            logger.warn(
              `Tentando reconectar (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) em 5s...`,
            );

            setTimeout(() => {
              isStarting = false; // Libera o semáforo para a tentativa ocorrer
              startWhatsapp();
            }, 5000);
          } else {
            logger.error(
              "Desconectado permanentemente (Sessão Encerrada/Deslogada).",
            );
            isStarting = false;
          }
        }
      },
    );

    sock.ev.on("messages.upsert", async ({ messages, type }) => {
      // Ignorar mensagens de histórico antigas (carregamento inicial)
      if (type !== "notify") return;

      for (const message of messages) {
        try {
          // Ignorar mensagens vazias
          if (!message.message) continue;

          // Ignorar mensagens enviadas pelo próprio bot
          if (message.key.fromMe) continue;

          /*
            =========================
            IGNORA STATUS
            =========================
            */

          const jid = message.key.remoteJid;

          // Ignorar mensagens sem JID - Por enquanto é pra ficar assim
          if (!jid) {
            logger.warn("Mensagem sem JID foi ignorada!");
            continue;
          }

          // Filtros de chat
          const isGroup = jid.endsWith("@g.us");
          const isStatus = jid === "status@broadcast";
          if (isGroup || isStatus) continue;

          // Filtros de eventos de sistema internos
          if (message.messageStubType) continue;

          // Tratamento para eventos internos e mensagens editadas
          if (message.message.protocolMessage) continue;

          if (
            message.message.reactionMessage ||
            message.message.pollUpdateMessage
          ) {
            continue;
          }

          /*
          =========================
          FORMATA MENSAGEM
          =========================
          */

          const formattedMessage = getMessage(message);

          // ignora mensagens inválidas ou vazias
          if (!formattedMessage || !formattedMessage.content) {
            logger.warn(`Mensagem inválida ou sem texto -> ${jid}`);
            continue;
          }

          /*
          =========================
          LOG DA MENSAGEM
          =========================
          */

          logger.info(`
            =========================
            NOVA MENSAGEM PRIVADA
            =========================
            JID: ${jid}
            PUSHNAME: ${formattedMessage.pushName || "Desconhecido"}
            FROM_ME: ${message.key.fromMe}
            CONTEÚDO: ${formattedMessage.content}
            =========================
            `);

          /*
          =========================
          PROCESSA FLOW
          =========================
          */

          await MessageHandler(formattedMessage);
        } catch (error) {
          logger.error(`Erro ao processar mensagem: ${error}`);
        }
      }
    });

    // Salvar as credenciais de autenticação
    sock.ev.on("creds.update", saveCreds);
    return sock;
  } catch (error) {
    isStarting = false;
    // @ts-ignore
    logger.error("Erro fatal ao iniciar o WhatsApp:", error);
    throw error;
  }
};

export function getWhatsapp() {
  if (!sock) {
    throw new Error("WhatsApp não iniciado");
  }
  return sock;
}
