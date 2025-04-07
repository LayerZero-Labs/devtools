export const HYPERLIQUID_URLS = {
    MAINNET: 'https://api.hyperliquid.xyz',
    TESTNET: 'https://api.hyperliquid-testnet.xyz',
}

export const RPC_URLS = {
    MAINNET: 'https://rpc.hyperliquid.xyz/evm',
    TESTNET: 'https://rpc.hyperliquid-testnet.xyz/evm',
}

export const ENDPOINTS = {
    INFO: '/info',
    EXCHANGE: '/exchange',
}

export function toAssetBridgeAddress(tokenIndex: number): string {
    const addressLength = 42
    const addressPrefix = '0x2'
    const indexAsHex = Number(tokenIndex).toString(16)

    const addressLengthWithoutPrefix = addressLength - addressPrefix.length
    return `${addressPrefix}${indexAsHex.padStart(addressLengthWithoutPrefix, '0')}`
}
