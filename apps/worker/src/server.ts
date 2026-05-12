import { messageQueue }
from '../../../shared/queue/messageQueue';

import { getWhatsapp }
from '../../../providers/whatsapp/baileys/client';

import { QueueJob }
from '../../../shared/types/QueueJob';

function delay(ms: number) {

    return new Promise(resolve =>
        setTimeout(resolve, ms)
    );
}

export async function startWorker() {

    console.log('Worker iniciado');

    while (true) {

        if (messageQueue.length > 0) {

            const job =
                messageQueue.shift();

            if (!job) continue;

            const sock =
                getWhatsapp();

            try {

                console.log(
                    'Processando job:',
                    job
                );

                const isGroup =
                    job.jid.endsWith('@g.us');

                const isLid =
                    job.jid.endsWith('@lid');

                const isUser =
                    job.jid.endsWith('@s.whatsapp.net');

                /*
                 =========================
                 PAYLOAD DA MENSAGEM
                 =========================
                */

                const messagePayload =
                    job.imagePath
                        ? {
                            image: {
                                url: job.imagePath
                            },

                            caption:
                                job.message.text
                        }

                        : {
                            text:
                                job.message.text
                        };

                /*
                 =========================
                 GRUPOS E LIDS
                 =========================
                */

                if (isGroup || isLid) {

                    await sock.sendPresenceUpdate(
                        'composing',
                        job.jid
                    );

                    await delay(2000);

                    const response =
                        await sock.sendMessage(
                            job.jid,
                            messagePayload
                        );

                    console.log(
                        'Mensagem enviada:',
                        response
                    );
                }

                /*
                 =========================
                 USUÁRIOS
                 =========================
                */

                else if (isUser) {

                    const [result] =
                        await sock.onWhatsApp(
                            job.jid
                        );

                    console.log(
                        'Lookup:',
                        result
                    );

                    if (!result?.exists) {

                        console.log(
                            'Número não existe no WhatsApp'
                        );

                        continue;
                    }

                    await sock.sendPresenceUpdate(
                        'composing',
                        result.jid
                    );

                    await delay(2000);

                    const response =
                        await sock.sendMessage(
                            result.jid,
                            messagePayload
                        );

                    console.log(
                        'Mensagem enviada:',
                        response
                    );
                }

                /*
                 =========================
                 JID INVÁLIDO
                 =========================
                */

                else {

                    console.log(
                        'JID inválido:',
                        job.jid
                    );
                }

                /*
                 =========================
                 DELAY ANTI-SPAM
                 =========================
                */

                const randomDelay =
                    Math.floor(
                        Math.random() * 5000
                    ) + 3000;

                await delay(randomDelay);

            } catch (error) {

                console.log(
                    'Erro ao enviar mensagem:',
                    error
                );
            }
        }

        await delay(1000);
    }
}