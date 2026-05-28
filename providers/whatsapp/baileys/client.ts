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
import { FormattedMessage, getMessage } from "../../../shared/utils/message";
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
      defaultQueryTimeoutMs: 0,
      //Torna o Baileys Silencioso - Menos logs
      logger: pino({ level: "silent" }),
    });

    // @ts-ignore
    if (CONNECTION_TYPE === "NUMBER" && !sock.authState.creds.registered) {
      try {
        const code = await sock.requestPairingCode(PHONE_NUMBER);
        logger.info(`Código de Pareamento: ${code}`);
      } catch (error) {
        logger.error("Erro ao obter o código.");
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
        }

        if (connection === "connecting") {
          sessionState.status = "CONNECTING";
        }

        if (connection === "open") {
          sessionState.status = "CONNECTED";
          sessionState.qr = null;
        }

        if (connection === "close") {
          sessionState.status = "DISCONNECTED";
        }

        switch (connection) {
          case "close":
            logger.error("Conexão fechada");
            // Remover o bot/deletar dados se necessário
            const shouldReconnect =
              (lastDisconnect?.error as Boom)?.output?.statusCode !==
              DisconnectReason.loggedOut;

            if (shouldReconnect) {
              reconnectAttempts++;

              if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
                logger.error("Máximo de tentativas atingido");
                return;
              }

              logger.warn(`Tentando reconectar (${reconnectAttempts})...`);

              setTimeout(() => {
                startWhatsapp();
              }, 3000);
            }
            break;
          case "open":
            reconnectAttempts = 0;
            logger.info("Bot Conectado");
            break;
        }

        // @ts-ignore
        if (qr !== undefined && CONNECTION_TYPE === "QR") {
          qrcode.generate(qr, { small: true });
        }
      },
    );

    sock.ev.on(
      "messages.upsert",
      async ({ messages }: { messages: WAMessage[] }) => {
        for (const message of messages) {
          try {
            /*
            =========================
            IGNORA EVENTOS VAZIOS
            =========================
            */

            if (!message.message) {
              logger.warn("Mensagem ignorada: sem conteúdo");
              continue;
            }

            /*
            =========================
            IGNORA MENSAGENS DO BOT
            =========================
            */

            if (message.key.fromMe) {
              logger.warn(
                `Mensagem ignorada: fromMe -> ${message.key.remoteJid}`,
              );

              continue;
            }

            /*
            =========================
            IGNORA STATUS
            =========================
            */

            const jid = message.key.remoteJid;

            if (!jid) {
              logger.warn("Mensagem ignorada: sem JID");
              continue;
            }

            const isGroup = jid.endsWith("@g.us");

            const isStatus = jid === "status@broadcast";

            if (isGroup || isStatus) {
              logger.warn(`Mensagem ignorada: ${jid}`);
              continue;
            }

            /*
            =========================
            IGNORA EVENTOS INTERNOS MD
            =========================
            */

            if (message.message.protocolMessage) {
              logger.warn(`ProtocolMessage ignorada -> ${jid}`);
              continue;
            }

            if (message.message.reactionMessage) {
              logger.warn(`ReactionMessage ignorada -> ${jid}`);
              continue;
            }

            // @ts-ignore
            if (message.message.pollUpdateMessage) {
              logger.warn(`PollUpdate ignorada -> ${jid}`);
              continue;
            }

            if (message.messageStubType) {
              logger.warn(`StubMessage ignorada -> ${jid}`);
              continue;
            }

            /*
            =========================
            FORMATA MENSAGEM
            =========================
            */

            // @ts-ignore
            const formattedMessage: FormattedMessage | undefined =
              getMessage(message);

            if (!formattedMessage) {
              logger.warn(`Mensagem inválida -> ${jid}`);
              continue;
            }

            /*
            =========================
            IGNORA SEM TEXTO
            =========================
            */

            if (!formattedMessage.content) {
              logger.warn(`Mensagem sem texto -> ${jid}`);
              continue;
            }

            /*
            =========================
            LOG DA MENSAGEM
            =========================
            */

            logger.info(`
            =========================
            NOVA MENSAGEM
            =========================
            JID: ${jid}
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
      },
    );

    // Salvar as credenciais de autenticação
    sock.ev.on("creds.update", saveCreds);
    return sock;
  } finally {
    isStarting = false;
  }
};

export function getWhatsapp() {
  if (!sock) {
    throw new Error("WhatsApp não iniciado");
  }

  return sock;
}
