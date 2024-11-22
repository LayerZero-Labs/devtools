import { Deserializer, SimpleTransaction } from '@aptos-labs/ts-sdk'

export const serializeTransactionPayload = (payload: SimpleTransaction): string => {
    const bcsBytes = payload.bcsToBytes()
    const buffer = Buffer.from(bcsBytes)
    const hexString = buffer.toString('hex')
    return hexString
}

export const deserializeTransactionPayload = (data: string): SimpleTransaction => {
    const hexString = data
    const buffer = Buffer.from(hexString, 'hex')
    const payload = new Deserializer(Uint8Array.from(buffer)).deserialize(SimpleTransaction)
    return payload
}
