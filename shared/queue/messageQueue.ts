type QueueMessage = {
    jid: string
    message: {
        text: string
    }
}

export const messageQueue: QueueMessage[] = []