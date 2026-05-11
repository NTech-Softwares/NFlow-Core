import { Router } from 'express'
import { messageQueue } from '../../../../shared/queue/messageQueue'

const router = Router()

router.post('/send-message', (req, res) => {

    const { number, message } = req.body

    if (!number || !message) {
        return res.status(400).json({
            success: false,
            error: 'Número e mensagem são obrigatórios'
        })
    }

    const formattedNumber = number.replace(/\D/g, '')

    messageQueue.push({
        jid: `${formattedNumber}@s.whatsapp.net`,
        message: {
            text: message
        }
    })

    console.log('Mensagem adicionada na fila')

    return res.json({
        success: true
    })
})

export default router