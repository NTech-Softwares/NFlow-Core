import { getWhatsapp } from '../client'

export async function getGroups() {
    const sock = getWhatsapp()

    if (!sock) {
        throw new Error('WhatsApp não conectado')
    }

    const groups = await sock.groupFetchAllParticipating()

    return Object.values(groups).map(group => ({
        id: group.id,
        name: group.subject,
        participants: group.participants.length
    }))
}