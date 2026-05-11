import { FormattedMessage } from "../../../../shared/utils/message";
import { messageQueue } from "../../../../shared/queue/messageQueue";
import { messages } from "../templates/messages";

const MessageHandler = (
    message: FormattedMessage
) => {

    const content =
        message.content?.toLowerCase();

    /*
     =========================
     MENU PRINCIPAL
     =========================
    */

    if (
        content === 'oi' ||
        content === 'olá' ||
        content === 'ola'
    ) {

        messageQueue.push({
            jid: message.key.remoteJid!,
            message: {
                text: messages.welcome
            }
        })
        
        return
    }

    /*
    =========================
    VOLTAR AO MENU
    =========================
    */

    if (
        content === '0' ||
        content === 'menu' ||
        content === 'voltar'
    ) {

        messageQueue.push({
            jid: message.key.remoteJid!,
            message: {
                text: messages.welcome
            }
        })

        return
    }

    /*
     =========================
     CURSOS
     =========================
    */

    if (content === '1') {

        messageQueue.push({
            jid: message.key.remoteJid!,
            message: {
                text: messages.courses
            }
        })

        return
    }

    /*
     =========================
     AUTOMAÇÃO
     =========================
    */

    if (content === '2') {

        messageQueue.push({
            jid: message.key.remoteJid!,
            message: {
                text: messages.automation
            }
        })

        return
    }

    /*
     =========================
     WEB
     =========================
    */

    if (content === '3') {

        messageQueue.push({
            jid: message.key.remoteJid!,
            message: {
                text: messages.web
            }
        })

        return
    }

    /*
     =========================
     MOBILE
     =========================
    */

    if (content === '4') {

        messageQueue.push({
            jid: message.key.remoteJid!,
            message: {
                text: messages.mobile
            }
        })

        return
    }

    /*
     =========================
     ATENDENTE
     =========================
    */

    if (content === '5') {

        messageQueue.push({
            jid: message.key.remoteJid!,
            message: {
                text: messages.attendant
            }
        })

        return
    }
}

export default MessageHandler;