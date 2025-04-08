import { Hex } from '@layerzerolabs/lz-utilities'

export interface BaseInfoRequest {
    type: string
    [key: string]: unknown
}

/** Base structure for exchange requests. */
export interface BaseExchangeRequest {
    /** Action to perform. */
    action: {
        /** Type of action. */
        type: string
        /** Additional action parameters. */
        [key: string]: unknown
    }
    /** Unique request identifier (recommended current timestamp in ms). */
    nonce: number
    /** Cryptographic signature. */
    signature: { r: Hex; s: Hex; v: number }
}

/** Base structure for exchange responses. */
export interface BaseExchangeResponse {
    /** Response status */
    status: 'ok' | 'err'
    /** Error message or success data */
    response:
        | string
        | {
              /** Type of response. */
              type: string
              /** Specific data for the operation. */
              data?: unknown
          }
}

export interface Signature {
    r: string
    s: string
    v: number
}

export type ValueType =
    | number
    | bigint
    | string
    | boolean
    | null
    | Uint8Array
    | readonly ValueType[]
    | ValueMap
    | BaseInfoRequest

export interface ValueMap {
    [key: string]: ValueType
}
