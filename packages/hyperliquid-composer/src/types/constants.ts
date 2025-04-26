export const HYPERLIQUID_URLS = {
    MAINNET: 'https://api.hyperliquid.xyz',
    TESTNET: 'https://api.hyperliquid-testnet.xyz',
}

export const RPC_URLS = {
    MAINNET: 'https://rpc.hyperliquid.xyz/evm',
    TESTNET: 'https://rpc.hyperliquid-testnet.xyz/evm',
}

export const CHAIN_IDS = {
    MAINNET: 999,
    TESTNET: 998,
}

export const ENDPOINTS = {
    INFO: '/info',
    EXCHANGE: '/exchange',
}

export const MAX_HYPERCORE_SUPPLY = 2 ** 64 - 1

/**
 * These are the token ids for USDC on hypercore mainnet and testnet
 * It can be reproduced by grabbing the entire spotMeta and finding USDC because Hyperliquid does not have an API to target query an asset (April 8, 2025)
 *  -   curl -X POST "https://api.hyperliquid.xyz/info" -H "Content-Type: application/json" -d '{"type": "spotMeta"}' > spotOut.json
 *  -   Goto tokens and the first entry should be USDC with an index of 0
 */
export const USDC_TOKEN_ID = {
    MAINNET: 0,
    TESTNET: 0,
}

export function toAssetBridgeAddress(tokenIndex: number): string {
    const addressLength = 42
    const addressPrefix = '0x2'
    const indexAsHex = Number(tokenIndex).toString(16)

    const addressLengthWithoutPrefix = addressLength - addressPrefix.length
    return `${addressPrefix}${indexAsHex.padStart(addressLengthWithoutPrefix, '0')}`
}
