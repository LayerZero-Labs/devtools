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
