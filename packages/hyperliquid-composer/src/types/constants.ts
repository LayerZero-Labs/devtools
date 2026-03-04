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

export const HYPE_INDEX = {
    MAINNET: 150,
    TESTNET: 1105,
} as const

export const MAX_HYPERCORE_SUPPLY = BigInt(2) ** BigInt(64) - BigInt(1) // 18446744073709551615n

/**
 * Standard quote tokens available on HyperLiquid Core, indexed by network.
 * These token IDs can be reproduced by querying the entire spotMeta:
 *   curl -X POST "https://api.hyperliquid.xyz/info" -H "Content-Type: application/json" -d '{"type": "spotMeta"}' > spotOut.json
 */
export const QUOTE_TOKENS = {
    MAINNET: [
        { tokenId: 0, name: 'USDC' },
        { tokenId: 235, name: 'USDe' },
        { tokenId: 268, name: 'USDT0' },
        { tokenId: 360, name: 'USDH' },
    ],
    TESTNET: [
        { tokenId: 0, name: 'USDC' },
        { tokenId: 1204, name: 'USDT0' },
        { tokenId: 1452, name: 'USDH' },
    ],
} as const

export function toAssetBridgeAddress(tokenIndex: number): string {
    const addressLength = 42
    const addressPrefix = '0x2'
    const indexAsHex = Number(tokenIndex).toString(16)

    const addressLengthWithoutPrefix = addressLength - addressPrefix.length
    return `${addressPrefix}${indexAsHex.padStart(addressLengthWithoutPrefix, '0')}`
}
