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
    assetBridgeAddress: string
    connected: boolean
}

export interface UserGenesis {
    userAndWei: Array<{
        address: string
        wei: string
    }>
    existingTokenAndWei: Array<{
        token: number
        wei: string
    }>
    blacklistUsers: string[]
}

export interface CoreSpotDeployment {
    coreSpot: CoreSpotMetaData
    txData: TxData
    userGenesis: UserGenesis
}

export interface SpotMeta {
    tokens: CoreSpotMetaData[]
}

export type SpotInfoBalance = [address: string, balance: string]

export interface SpotInfo {
    name: string
    maxSupply: string
    totalSupply: string
    circulatingSupply: string
    szDecimals: number
    weiDecimals: number
    midPx: string
    markPx: string
    prevDayPx: string
    genesis: {
        userBalances: SpotInfoBalance[]
        existingTokenBalances: SpotInfoBalance[]
    }
    deployer: string
    deployGas: string
    deployTime: string
    seededUsdc: string
    nonCirculatingUserBalances: SpotInfoBalance[]
    futureEmissions: string
}

export interface DeployState {
    token: number
    spec: {
        name: string
        szDecimals: number
        weiDecimals: number
    }
    fullName: string | null
    spots: number[]
    maxSupply: number
    hyperliquidityGenesisBalance: string
    totalGenesisBalanceWei: string
    userGenesisBalances: [string, string][]
    existingTokenGenesisBalances: [number, string][]
}

export interface GasAuction {
    startTimeSeconds: number
    durationSeconds: number
    startGas: string
    currentGas: string | null
    endGas: string
}

export interface SpotDeployStates {
    states: DeployState[]
    gasAuction: GasAuction
}
