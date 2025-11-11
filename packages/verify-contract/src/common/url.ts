import { type NetworkName } from './types'

// Etherscan API V2 base URL - works for all supported chains
export const ETHERSCAN_V2_BASE_URL = 'https://api.etherscan.io/v2/api'

export const getDefaultScanApiUrl = (networkName: string): string | undefined => DEFAULT_SCAN_API_URLS.get(networkName)

export const getDefaultChainId = (networkName: string): number | undefined => NETWORK_CHAIN_IDS.get(networkName)

/**
 * Tries to use the scan API url to get a scan browser URL
 *
 * This will only work for URLs that starts with api.
 *
 * @param scanApiUrl
 * @returns
 */
export const tryGetScanBrowserUrlFromScanUrl = (scanApiUrl: string): string | undefined => {
    try {
        const urlObject = new URL(scanApiUrl)
        if (!urlObject.hostname.startsWith('api.') && !urlObject.hostname.startsWith('api-')) {
            return undefined
        }

        urlObject.hostname = urlObject.hostname.replace(/^api[.-]/, '')
        urlObject.pathname = '/'

        return urlObject.toString()
    } catch {
        return undefined
    }
}

export const tryCreateScanContractUrl = (scanBrowserUrl: string, address: string): string | undefined => {
    try {
        const urlObject = new URL(scanBrowserUrl)
        urlObject.pathname = `/address/${address}`

        return urlObject.toString()
    } catch {
        return undefined
    }
}

// For Etherscan API v2, we use a unified base URL but keep legacy URLs as fallback for non-Etherscan explorers
const DEFAULT_SCAN_API_URLS: Map<NetworkName, string> = new Map([
    ['amoy', ETHERSCAN_V2_BASE_URL],
    ['amoy-mainnet', ETHERSCAN_V2_BASE_URL],
    ['arbitrum', ETHERSCAN_V2_BASE_URL],
    ['arbitrum-goerli', ETHERSCAN_V2_BASE_URL],
    ['arbitrum-mainnet', ETHERSCAN_V2_BASE_URL],
    ['arbsep-testnet', ETHERSCAN_V2_BASE_URL],
    ['astar', 'https://astar.blockscout.com/api'], // Blockscout - not part of Etherscan network
    ['astar-mainnet', 'https://astar.blockscout.com/api'],
    ['aurora', 'https://explorer.mainnet.aurora.dev/api'], // Aurora explorer - not part of Etherscan network
    ['aurora-mainnet', 'https://explorer.mainnet.aurora.dev/api'],
    ['avalanche', ETHERSCAN_V2_BASE_URL],
    ['avalanche-mainnet', ETHERSCAN_V2_BASE_URL],
    ['avalanche-testnet', ETHERSCAN_V2_BASE_URL],
    ['base', ETHERSCAN_V2_BASE_URL],
    ['base-goerli', ETHERSCAN_V2_BASE_URL],
    ['base-mainnet', ETHERSCAN_V2_BASE_URL],
    ['blast', ETHERSCAN_V2_BASE_URL],
    ['blast-mainnet', ETHERSCAN_V2_BASE_URL],
    ['bsc', ETHERSCAN_V2_BASE_URL],
    ['bsc-mainnet', ETHERSCAN_V2_BASE_URL],
    ['bsc-testnet', ETHERSCAN_V2_BASE_URL],
    ['ebi', 'https://explorer.ebi.xyz/api'], // Custom explorer
    ['ebi-mainnet', 'https://explorer.ebi.xyz/api'],
    ['ethereum', ETHERSCAN_V2_BASE_URL],
    ['ethereum-goerli', ETHERSCAN_V2_BASE_URL],
    ['ethereum-mainnet', ETHERSCAN_V2_BASE_URL],
    ['etherlink', 'https://explorer.etherlink.com/api'], // Custom explorer
    ['etherlink-mainnet', 'https://explorer.etherlink.com/api'],
    ['fantom', ETHERSCAN_V2_BASE_URL],
    ['fantom-mainnet', ETHERSCAN_V2_BASE_URL],
    ['fantom-testnet', ETHERSCAN_V2_BASE_URL],
    ['flare', 'https://api.routescan.io/v2/network/mainnet/evm/14/etherscan'], // Routescan - not part of Etherscan network
    ['flare-mainnet', 'https://api.routescan.io/v2/network/mainnet/evm/14/etherscan'],
    ['fraxtal', ETHERSCAN_V2_BASE_URL],
    ['fraxtal-mainnet', ETHERSCAN_V2_BASE_URL],
    ['fuji', ETHERSCAN_V2_BASE_URL],
    ['fuji-mainnet', ETHERSCAN_V2_BASE_URL],
    ['gnosis', ETHERSCAN_V2_BASE_URL],
    ['gnosis-mainnet', ETHERSCAN_V2_BASE_URL],
    ['goerli', ETHERSCAN_V2_BASE_URL],
    ['goerli-mainnet', ETHERSCAN_V2_BASE_URL],
    ['gravity', 'https://explorer.gravity.xyz/api'], // Custom explorer
    ['gravity-mainnet', 'https://explorer.gravity.xyz/api'],
    ['iota', 'https://explorer.evm.iota.org/api'], // Custom explorer
    ['iota-mainnet', 'https://explorer.evm.iota.org/api'],
    ['kava', 'https://kavascan.com/api'], // Kavascan - not part of Etherscan network
    ['kava-mainnet', 'https://kavascan.com/api'],
    ['kava-testnet', 'https://testnet.kavascan.com/api'],
    ['klaytn', 'https://api-cypress.klaytnscope.com/api'], // Klaytnscope - not part of Etherscan network
    ['klaytn-mainnet', 'https://api-cypress.klaytnscope.com/api'],
    ['klaytn-testnet', 'https://api-baobab.klaytnscope.com/api'],
    ['linea', ETHERSCAN_V2_BASE_URL],
    ['linea-mainnet', ETHERSCAN_V2_BASE_URL],
    ['mantle', 'https://explorer.mantle.xyz/api'], // Mantle explorer - not part of Etherscan network
    ['mantle-mainnet', 'https://explorer.mantle.xyz/api'],
    ['manta', 'https://pacific-explorer.manta.network/api'], // Manta explorer - not part of Etherscan network
    ['manta-mainnet', 'https://pacific-explorer.manta.network/api'],
    ['metis', 'https://api.routescan.io/v2/network/mainnet/evm/1088/etherscan'], // Routescan - not part of Etherscan network
    ['metis-mainnet', 'https://api.routescan.io/v2/network/mainnet/evm/1088/etherscan'],
    ['mode', 'https://explorer.mode.network/api'], // Mode explorer - not part of Etherscan network
    ['mode-mainnet', 'https://explorer.mode.network/api'],
    ['moonbeam', ETHERSCAN_V2_BASE_URL],
    ['moonbeam-mainnet', ETHERSCAN_V2_BASE_URL],
    ['moonbeam-testnet', ETHERSCAN_V2_BASE_URL],
    ['moonriver', ETHERSCAN_V2_BASE_URL],
    ['moonriver-mainnet', ETHERSCAN_V2_BASE_URL],
    ['optimism', ETHERSCAN_V2_BASE_URL],
    ['optimism-goerli', ETHERSCAN_V2_BASE_URL],
    ['optimism-mainnet', ETHERSCAN_V2_BASE_URL],
    ['optsep-testnet', ETHERSCAN_V2_BASE_URL],
    ['polygon', ETHERSCAN_V2_BASE_URL],
    ['polygon-mainnet', ETHERSCAN_V2_BASE_URL],
    ['rarible', 'https://mainnet.explorer.rarichain.org/api'], // Rarible explorer - not part of Etherscan network
    ['rarible-mainnet', 'https://mainnet.explorer.rarichain.org/api'],
    ['sepolia-testnet', ETHERSCAN_V2_BASE_URL],
    ['scroll', ETHERSCAN_V2_BASE_URL],
    ['scroll-mainnet', ETHERSCAN_V2_BASE_URL],
    ['sei', 'https://seitrace.com/pacific-1/api'], // Seitrace - not part of Etherscan network
    ['sei-mainnet', 'https://seitrace.com/pacific-1/api'],
    ['taiko', ETHERSCAN_V2_BASE_URL],
    ['taiko-mainnet', ETHERSCAN_V2_BASE_URL],
    ['xchain', 'https://xchain-explorer.idex.io/api'], // IDEX explorer - not part of Etherscan network
    ['xchain-mainnet', 'https://xchain-explorer.idex.io/api'],
    ['xlayer', 'https://www.oklink.com/api/v5/explorer/contract/verify-source-code-plugin/XLAYER'], // OKLink - not part of Etherscan network
    ['xlayer-mainnet', 'https://www.oklink.com/api/v5/explorer/contract/verify-source-code-plugin/XLAYER'],
    ['zkatana', 'https://astar-zkevm.explorer.startale.com/api'], // Startale explorer - not part of Etherscan network
    ['zkatana-mainnet', 'https://astar-zkevm.explorer.startale.com/api'],
    ['zkconsensys', ETHERSCAN_V2_BASE_URL],
    ['zkconsensys-mainnet', ETHERSCAN_V2_BASE_URL],
    ['zkpolygon', ETHERSCAN_V2_BASE_URL],
    ['zkpolygon-mainnet', ETHERSCAN_V2_BASE_URL],
])

// Standard EVM chain IDs for Etherscan API v2
const NETWORK_CHAIN_IDS: Map<NetworkName, number> = new Map([
    // Ethereum
    ['ethereum', 1],
    ['ethereum-mainnet', 1],
    ['ethereum-goerli', 5],
    ['goerli', 5],
    ['goerli-mainnet', 5],
    ['sepolia-testnet', 11155111],

    // Polygon
    ['polygon', 137],
    ['polygon-mainnet', 137],
    ['amoy', 80002],
    ['amoy-mainnet', 80002],
    ['zkpolygon', 1101],
    ['zkpolygon-mainnet', 1101],

    // Arbitrum
    ['arbitrum', 42161],
    ['arbitrum-mainnet', 42161],
    ['arbitrum-goerli', 421613],
    ['arbsep-testnet', 421614],

    // Optimism
    ['optimism', 10],
    ['optimism-mainnet', 10],
    ['optimism-goerli', 420],
    ['optsep-testnet', 11155420],

    // Base
    ['base', 8453],
    ['base-mainnet', 8453],
    ['base-goerli', 84531],

    // Avalanche
    ['avalanche', 43114],
    ['avalanche-mainnet', 43114],
    ['avalanche-testnet', 43113],
    ['fuji', 43113],
    ['fuji-mainnet', 43113],

    // BSC
    ['bsc', 56],
    ['bsc-mainnet', 56],
    ['bsc-testnet', 97],

    // Fantom
    ['fantom', 250],
    ['fantom-mainnet', 250],
    ['fantom-testnet', 4002],

    // Gnosis
    ['gnosis', 100],
    ['gnosis-mainnet', 100],

    // Aurora
    ['aurora', 1313161554],
    ['aurora-mainnet', 1313161554],

    // Blast
    ['blast', 81457],
    ['blast-mainnet', 81457],

    // Linea
    ['linea', 59144],
    ['linea-mainnet', 59144],
    ['zkconsensys', 59144],
    ['zkconsensys-mainnet', 59144],

    // Scroll
    ['scroll', 534352],
    ['scroll-mainnet', 534352],

    // Moonbeam
    ['moonbeam', 1284],
    ['moonbeam-mainnet', 1284],
    ['moonbeam-testnet', 1287],

    // Moonriver
    ['moonriver', 1285],
    ['moonriver-mainnet', 1285],

    // Fraxtal
    ['fraxtal', 252],
    ['fraxtal-mainnet', 252],

    // Kava
    ['kava', 2222],
    ['kava-mainnet', 2222],
    ['kava-testnet', 2221],

    // Klaytn
    ['klaytn', 8217],
    ['klaytn-mainnet', 8217],
    ['klaytn-testnet', 1001],

    // Mantle
    ['mantle', 5000],
    ['mantle-mainnet', 5000],

    // Manta
    ['manta', 169],
    ['manta-mainnet', 169],

    // Metis
    ['metis', 1088],
    ['metis-mainnet', 1088],

    // Mode
    ['mode', 34443],
    ['mode-mainnet', 34443],

    // Taiko
    ['taiko', 167000],
    ['taiko-mainnet', 167000],

    // Flare
    ['flare', 14],
    ['flare-mainnet', 14],

    // Astar
    ['astar', 592],
    ['astar-mainnet', 592],
    ['zkatana', 1261120],
    ['zkatana-mainnet', 1261120],

    // Sei
    ['sei', 1329],
    ['sei-mainnet', 1329],

    // Gravity
    ['gravity', 1625],
    ['gravity-mainnet', 1625],

    // IOTA
    ['iota', 8822],
    ['iota-mainnet', 8822],

    // Etherlink
    ['etherlink', 42793],
    ['etherlink-mainnet', 42793],

    // Rarible
    ['rarible', 1380012617],
    ['rarible-mainnet', 1380012617],

    // EBI
    ['ebi', 2910],
    ['ebi-mainnet', 2910],

    // X Chain
    ['xchain', 7762959],
    ['xchain-mainnet', 7762959],

    // X Layer
    ['xlayer', 196],
    ['xlayer-mainnet', 196],
])
