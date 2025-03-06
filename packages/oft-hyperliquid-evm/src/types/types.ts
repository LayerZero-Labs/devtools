import { Hex } from '@layerzerolabs/lz-utilities'

export interface Signature {
    r: string
    s: string
    v: number
}

export interface NativeSpot {
    name: string
    szDecimals: number
    weiDecimals: number
    index: number
    tokenId: string
    isCanonical: boolean
    evmContract: string | null
    fullName: string | null
    deployerTradingFeeShare: string
}

export interface NativeSpots {
    [key: string]: NativeSpot
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

/**
 * Configure block type for EVM transactions.
 * @returns {SuccessResponse}
 * @see https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/evm/dual-block-architecture
 */
export interface EvmUserModifyRequest extends BaseExchangeRequest {
    /** Action to be performed. */
    action: {
        /** Type of action. */
        type: 'evmUserModify'
        /** `true` for large blocks, `false` for small blocks. */
        usingBigBlocks: boolean
    }
}

export interface EvmSpotDeployRequest extends BaseExchangeRequest {
    /** Action to be performed. */
    action: {
        type: 'spotDeploy'
        requestEVMContract: {
            type: 'requestEvmContract'
            token: number
            address: string
            evmExtraWeiDecimals: number
        }
    }
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

/** Successful response without specific data. */
export interface SuccessResponse extends BaseExchangeResponse {
    /** Successful status. */
    status: 'ok'
    /** Response details. */
    response: {
        /** Type of response. */
        type: 'default'
    }
}

export type ValueType = number | bigint | string | boolean | null | Uint8Array | readonly ValueType[] | ValueMap

export interface ValueMap {
    [key: string]: ValueType
}
