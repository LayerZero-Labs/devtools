import { Hex } from '@layerzerolabs/lz-utilities'

export interface Signature {
    r: string
    s: string
    v: number
}

export interface CoreSpotMetaData {
    name: string
    szDecimals: number
    weiDecimals: number
    index: number
    tokenId: string
    isCanonical: boolean
    evmContract: null | {
        address: string
        evm_extra_wei_decimals: number
    }
    fullName: string | null
    deployerTradingFeeShare: string
}

export interface TxData {
    from: string
    txHash: string
    nonce: number
    weiDiff: number
    connected: boolean
}

export interface SpotMeta {
    tokens: CoreSpotMetaData[]
}

export interface CoreSpotDeployment {
    coreSpot: CoreSpotMetaData
    txData: TxData
}

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

/**
 * Configure block type for EVM transactions.
 * @returns {SuccessResponse}
 * @see https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/evm/dual-block-architecture
 */
export interface EvmUserModifyRequest extends BaseExchangeRequest {
    action: {
        type: 'evmUserModify'
        usingBigBlocks: boolean
    }
}

export interface EvmSpotDeploy extends BaseExchangeRequest {
    action: {
        type: 'spotDeploy'
        requestEvmContract: {
            token: number
            address: string
            evmExtraWeiDecimals: number
        }
    }
}

export interface FinalizeEvmContract extends BaseExchangeRequest {
    action: {
        type: 'finalizeEvmContract'
        token: number
        input: {
            create: {
                nonce: number
            }
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
