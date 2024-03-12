import { type NetworkName } from './types'

export const getDefaultScanApiUrl = (networkName: string): string | undefined => DEFAULT_SCAN_API_URLS.get(networkName)

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

const DEFAULT_SCAN_API_URLS: Map<NetworkName, string> = new Map([
    ['avalanche', 'https://api.snowtrace.io/api'],
    ['avalanche-mainnet', 'https://api.snowtrace.io/api'],
    ['fuji', 'https://api-testnet.snowtrace.io/api'],
    ['avalanche-testnet', 'https://api-testnet.snowtrace.io/api'],
    ['arbitrum', 'https://api.arbiscan.io/api'],
    ['arbitrum-goerli', 'https://api-goerli.arbiscan.io/api'],
    ['bsc', 'https://api.bscscan.com/api'],
    ['bsc-testnet', 'https://api-testnet.bscscan.com/api'],
    ['ethereum', 'https://api.etherscan.io/api'],
    ['ethereum-goerli', 'https://api-goerli.etherscan.io/api'],
    ['goerli', 'https://api-goerli.etherscan.io/api'],
    ['fantom', 'https://api.ftmscan.com/api'],
    ['fantom-testnet', 'https://api-testnet.ftmscan.com/api'],
    ['kava', 'https://kavascan.com/api'],
    ['kava-mainnet', 'https://kavascan.com/api'],
    ['kava-testnet', 'https://testnet.kavascan.com/api'],
    ['polygon', 'https://api.polygonscan.com/api'],
    ['mumbai', 'https://api-testnet.polygonscan.com/api'],
    ['optimism', 'https://api-optimistic.etherscan.io/api'],
    ['optimism-goerli', 'https://api-goerli-optimistic.etherscan.io/api'],
    ['gnosis', 'https://api.gnosisscan.io/api'],
    ['zkpolygon', 'https://api-zkevm.polygonscan.com/api'],
    ['zkpolygon-mainnet', 'https://api-zkevm.polygonscan.com/api'],
    ['base', 'https://api.basescan.org/api'],
    ['base-mainnet', 'https://api.basescan.org/api'],
    ['base-goerli', 'https://api-goerli.basescan.org/api'],
    ['linea', 'https://api.lineascan.build/api'],
    ['linea-mainnet', 'https://api.lineascan.build/api'],
    ['zkconsensys', 'https://api.lineascan.build/api'],
    ['zkconsensys-mainnet', 'https://api.lineascan.build/api'],
    ['moonbeam', 'https://api-moonbeam.moonscan.io/api'],
    ['moonbeam-testnet', 'https://api-moonbase.moonscan.io/api'],
    ['mantle', 'https://explorer.mantle.xyz/api'],
    ['metis', 'https://api.routescan.io/v2/network/mainnet/evm/1088/etherscan'],
    ['scroll', 'https://api.scrollscan.com/api'],
    ['fraxtal', 'https://api.fraxscan.com/api'],
    ['mode', 'https://explorer.mode.network/api'],
    ['etherlink', 'https://explorer.etherlink.com/api'],
])
