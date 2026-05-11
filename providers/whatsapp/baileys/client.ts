import P from 'pino'
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
import MessageHandler from "./handlers/message";

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
                `Versão atual do WaWeb: ${version.join(".")} | ${isLatest ? "Versão mais recente" : "Está desatualizado"
                }`
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
                    `Socket Connection Update: ${connection || ""} ${lastDisconnect || ""}`
                );

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

                            logger.info(`Tentando reconectar (${reconnectAttempts})...`);

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
            }
        );
        
        sock.ev.on("messages.upsert", ({ messages }: { messages: WAMessage[] }) => {
          for (let index = 0; index < messages.length; index++) {
            const message = messages[index];
        
            const isGroup = message.key.remoteJid?.endsWith("@g.us");
            const isStatus = message.key.remoteJid === "status@broadcast";
        
            if (isGroup || isStatus) continue;
        
            // @ts-ignore
            const formattedMessage: FormattedMessage | undefined = getMessage(message);
            if (formattedMessage !== undefined) {
              MessageHandler(formattedMessage);
            }
          }
        });

        // Salvar as credenciais de autenticação
        sock.ev.on("creds.update", saveCreds);
        return sock;

    } finally {
        isStarting = false;
    }
};

export function getWhatsapp() {
    if (!sock) {
        throw new Error('WhatsApp não iniciado')
    }

    return sock
}