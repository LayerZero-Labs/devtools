import { fromBase64, toBase64 } from '@mysten/bcs'

export const serializeTransactionBytes = (bytes: Uint8Array): string => toBase64(bytes)

export const deserializeTransactionBytes = (data: string): Uint8Array => fromBase64(data)
