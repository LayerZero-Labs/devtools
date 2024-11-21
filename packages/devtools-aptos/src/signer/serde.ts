import {
    Serializer,
    Deserializer,
    TransactionPayloadEntryFunction,
    TransactionPayload,
    SimpleTransaction,
    Transaction,
} from '@aptos-labs/ts-sdk'

export const serializeTransactionPayload = (payload: SimpleTransaction): string => {
    console.log('Serializing transaction payload:', payload)
    // const serializer = new Serializer()

    // payload.serialize(serializer)
    // // payload.serialize(serializer)

    // const bytes = payload.bcsToBytes()
    // console.log('bytes', bytes)

    payload.bcsToBytes()

    // const deserializer = new Deserializer(bytes)
    // const entryFunctionPayload = TransactionPayloadEntryFunction.load(deserializer)
    // // const entryFunctionPayload = deserializer.deserialize(TransactionPayloadEntryFunction)
    // console.log('payload', JSON.stringify(payload))
    // console.log('entryFunctionPayload', JSON.stringify(entryFunctionPayload))

    // const result = Buffer.from(bytes).toString('hex')
    // console.log('Serialized result:', result)
    // console.log('Serialized result 2:', payload.bcsToHex())

    return Buffer.from(payload.bcsToBytes()).toString('hex')
}

export const deserializeTransactionPayload = (data: string): SimpleTransaction => {
    console.log('Deserializing data:', data)

    const deserializer = new Deserializer(Uint8Array.from(Buffer.from(data, 'hex')))
    const transactionPayload = deserializer.deserialize(SimpleTransaction)

    // const deserializer = new Deserializer(Buffer.from(data, 'hex'))
    // const result = TransactionPayloadEntryFunction.load(deserializer) as TransactionPayloadEntryFunction
    // const result = TransactionPayloadEntryFunction.load(deserializer) as TransactionPayloadEntryFunction
    // console.log('Deserialized payload:', result)
    return transactionPayload // TODO: fix this
}

// export const deserializeTransactionPayload = (data: string): TransactionPayloadEntryFunction => {
//     console.log('Deserializing data:', data)
//     const deserializer = new Deserializer(Buffer.from(data, 'hex'))

//     const result = TransactionPayload.deserialize(deserializer) as TransactionPayloadEntryFunction

//     // Transform the args to match the expected format
//     if (result.entryFunction) {
//         result.entryFunction.args = result.entryFunction.args.map((arg) => {
//             if ('value' in arg && 'value' in arg.value) {
//                 if (arg.value.value instanceof Uint8Array) {
//                     return { data: arg.value.value }
//                 } else if (arg.value.value.length === 8) {
//                     // Convert 8-byte array to BigInt
//                     const value = BigInt(Buffer.from(arg.value.value).readBigUInt64LE())
//                     return { value }
//                 }
//             }
//             return arg
//         })
//     }

//     console.log('Deserialized payload:', result)
//     return result
// }
