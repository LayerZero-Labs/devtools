import type { ValueType } from '@/types'
import { Wallet } from 'ethers'

export function encodeHex(data: Uint8Array): string {
    return Buffer.from(data).toString('hex')
}

export function decodeHex(hexString: string): Uint8Array {
    return new Uint8Array(Buffer.from(hexString, 'hex'))
}

/** Layer to make {@link https://jsr.io/@std/msgpack | @std/msgpack} compatible with {@link https://github.com/msgpack/msgpack-javascript | @msgpack/msgpack}. */
export function normalizeIntegersForMsgPack(obj: ValueType): ValueType {
    const THIRTY_ONE_BITS = 2147483648
    const THIRTY_TWO_BITS = 4294967296

    if (
        typeof obj === 'number' &&
        Number.isInteger(obj) &&
        obj <= Number.MAX_SAFE_INTEGER &&
        obj >= Number.MIN_SAFE_INTEGER &&
        (obj >= THIRTY_TWO_BITS || obj < -THIRTY_ONE_BITS)
    ) {
        return BigInt(obj)
    }

    if (Array.isArray(obj)) {
        return obj.map(normalizeIntegersForMsgPack)
    }

    if (obj && typeof obj === 'object' && obj !== null) {
        return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, normalizeIntegersForMsgPack(value)]))
    }

    return obj
}

/** Checks if the given value is an abstract ethers v5 signer. */
export function isAbstractEthersV5Signer(client: unknown): client is Wallet {
    return (
        typeof client === 'object' &&
        client !== null &&
        '_signTypedData' in client &&
        typeof client._signTypedData === 'function' &&
        client._signTypedData.length === 3
    )
}
