import { messageQueue } from '../../../shared/queue/messageQueue'
import { getWhatsapp } from '../../../providers/whatsapp/baileys/client'

function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

export async function startWorker() {

    console.log('Worker iniciado')

    while (true) {

        if (messageQueue.length > 0) {

            const job = messageQueue.shift()

            if (!job) continue

            const sock = getWhatsapp()

            try {

                console.log('Processando job:', job)

                const [result] =
                    await sock.onWhatsApp(job.jid)

                console.log('Lookup:', result)

                if (!result?.exists) {

                    console.log(
                        'Número não existe no WhatsApp'
                    )

                    continue
                }

                await sock.sendPresenceUpdate(
                    'composing',
                    result.jid
                )

                await delay(2000)

                const response =
                    await sock.sendMessage(
                        result.jid,
                        job.message
                    )

                console.log(
                    'Mensagem enviada:',
                    response
                )

                const randomDelay =
                    Math.floor(Math.random() * 5000) + 3000

                await delay(randomDelay)

            } catch (error) {

                console.log(
                    'Erro ao enviar mensagem:',
                    error
                )
            }
        }

        await delay(1000)
    }
}