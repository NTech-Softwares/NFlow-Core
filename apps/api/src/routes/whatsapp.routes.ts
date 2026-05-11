import { Router } from 'express'
import { messageQueue } from '../../../../shared/queue/messageQueue'

import { getGroups } from '../../../../providers/whatsapp/baileys/services/groups.service'
import { logger } from '../../../../shared/utils/logger'

const router = Router()

router.get('/list-groups', async (req, res) => {
    try {
        const grupos = await getGroups()

        return res.json({
            success: true,
            array: grupos
        })
    } catch (error) {
        return res.status(500).json({
            error: 'Erro ao listar grupos'
        })
    }
})

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

router.post('/send-campaign', (req, res) => {
    const { groups, message } = req.body

    if (!groups?.length || !message) {
        return res.status(400).json({
            success: false,
            error: 'Selecione pelo menos um grupo e uma mensagem'
        })
    }

    try {
        groups.forEach((groupId: string) => {
            messageQueue.push({
                jid: groupId,
                message: {
                    text: message
                }
            })
        })

        console.log(
            `${groups.length} mensagens adicionadas na fila`
        )

        return res.json({
            success: true,
            totalGroups: groups.length
        })
    } catch (err) {
        console.log(err)
        return res.status(500).json({
            success: false,
            error: 'Erro ao enviar campanha'
        })
    }
})

export default router