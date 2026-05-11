import { WASocket } from "@whiskeysockets/baileys";
import { FormattedMessage } from "../../../../shared/utils/message";
import { messageQueue } from "../../../../shared/queue/messageQueue";

const MessageHandler = (message: FormattedMessage) => {
    if (message.content === 'oi' || message.content === 'Oi') {
        console.log("Tentando Enviar")
        messageQueue.push({
            jid: message.key.remoteJid!,
            message: {
                text: 'Olá! Você está falando com a NTech. \n\n Digite uma das opções para ser atendido: \n\n 1- Aprender para cursos e treinamentos \n\n 2- Automação para automações de processos no seu negócio \n\n 3- Web para sites ou landing pages \n\n 4- App para aplicativos móveis Android ou IOS'
            }
        })
        //await bot.sendMessage(message.key.remoteJid!, { text: 'Olá! Aqui quem fala é o bot!' })
    }
}

export default MessageHandler;