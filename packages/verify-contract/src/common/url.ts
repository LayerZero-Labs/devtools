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
    ['amoy', 'https://amoy.polygonscan.com/api'],
    ['amoy-mainnet', 'https://amoy.polygonscan.com/api'],
    ['arbitrum', 'https://api.arbiscan.io/api'],
    ['arbitrum-goerli', 'https://api-goerli.arbiscan.io/api'],
    ['arbitrum-mainnet', 'https://api.arbiscan.io/api'],
    ['arbsep-testnet', 'https://api-sepolia.arbiscan.io/api'],
    ['astar', 'https://astar.blockscout.com/api'],
    ['astar-mainnet', 'https://astar.blockscout.com/api'],
    ['aurora', 'https://explorer.mainnet.aurora.dev/api'],
    ['aurora-mainnet', 'https://explorer.mainnet.aurora.dev/api'],
    ['avalanche', 'https://api.snowtrace.io/api'],
    ['avalanche-mainnet', 'https://api.snowtrace.io/api'],
    ['avalanche-testnet', 'https://api-testnet.snowtrace.io/api'],
    ['base', 'https://api.basescan.org/api'],
    ['base-goerli', 'https://api-goerli.basescan.org/api'],
    ['base-mainnet', 'https://api.basescan.org/api'],
    ['blast', 'https://api.blastscan.io/api'],
    ['blast-mainnet', 'https://api.blastscan.io/api'],
    ['bsc', 'https://api.bscscan.com/api'],
    ['bsc-mainnet', 'https://api.bscscan.com/api'],
    ['bsc-testnet', 'https://api-testnet.bscscan.com/api'],
    ['ebi', 'https://explorer.ebi.xyz/api'],
    ['ebi-mainnet', 'https://explorer.ebi.xyz/api'],
    ['ethereum', 'https://api.etherscan.io/api'],
    ['ethereum-goerli', 'https://api-goerli.etherscan.io/api'],
    ['ethereum-mainnet', 'https://api.etherscan.io/api'],
    ['etherlink', 'https://explorer.etherlink.com/api'],
    ['etherlink-mainnet', 'https://explorer.etherlink.com/api'],
    ['fantom', 'https://api.ftmscan.com/api'],
    ['fantom-mainnet', 'https://api.ftmscan.com/api'],
    ['fantom-testnet', 'https://api-testnet.ftmscan.com/api'],
    ['flare', 'https://api.routescan.io/v2/network/mainnet/evm/14/etherscan'],
    ['flare-mainnet', 'https://api.routescan.io/v2/network/mainnet/evm/14/etherscan'],
    ['fraxtal', 'https://api.fraxscan.com/api'],
    ['fraxtal-mainnet', 'https://api.fraxscan.com/api'],
    ['fuji', 'https://api-testnet.snowtrace.io/api'],
    ['fuji-mainnet', 'https://api-testnet.snowtrace.io/api'],
    ['gnosis', 'https://api.gnosisscan.io/api'],
    ['gnosis-mainnet', 'https://api.gnosisscan.io/api'],
    ['goerli', 'https://api-goerli.etherscan.io/api'],
    ['goerli-mainnet', 'https://api-goerli.etherscan.io/api'],
    ['gravity', 'https://explorer.gravity.xyz/api'],
    ['gravity-mainnet', 'https://explorer.gravity.xyz/api'],
    ['iota', 'https://explorer.evm.iota.org/api'],
    ['iota-mainnet', 'https://explorer.evm.iota.org/api'],
    ['kava', 'https://kavascan.com/api'],
    ['kava-mainnet', 'https://kavascan.com/api'],
    ['kava-testnet', 'https://testnet.kavascan.com/api'],
    ['klaytn', 'https://api-cypress.klaytnscope.com/api'],
    ['klaytn-mainnet', 'https://api-cypress.klaytnscope.com/api'],
    ['klaytn-testnet', 'https://api-baobab.klaytnscope.com/api'],
    ['linea', 'https://api.lineascan.build/api'],
    ['linea-mainnet', 'https://api.lineascan.build/api'],
    ['mantle', 'https://explorer.mantle.xyz/api'],
    ['mantle-mainnet', 'https://explorer.mantle.xyz/api'],
    ['manta', 'https://pacific-explorer.manta.network/api'],
    ['manta-mainnet', 'https://pacific-explorer.manta.network/api'],
    ['metis', 'https://api.routescan.io/v2/network/mainnet/evm/1088/etherscan'],
    ['metis-mainnet', 'https://api.routescan.io/v2/network/mainnet/evm/1088/etherscan'],
    ['mode', 'https://explorer.mode.network/api'],
    ['mode-mainnet', 'https://explorer.mode.network/api'],
    ['moonbeam', 'https://api-moonbeam.moonscan.io/api'],
    ['moonbeam-mainnet', 'https://api-moonbeam.moonscan.io/api'],
    ['moonbeam-testnet', 'https://api-moonbase.moonscan.io/api'],
    ['moonriver', 'https://api-moonriver.moonscan.io/api'],
    ['moonriver-mainnet', 'https://api-moonriver.moonscan.io/api'],
    ['optimism', 'https://api-optimistic.etherscan.io/api'],
    ['optimism-goerli', 'https://api-goerli-optimistic.etherscan.io/api'],
    ['optimism-mainnet', 'https://api-optimistic.etherscan.io/api'],
    ['optsep-testnet', 'https://api-sepolia-optimistic.etherscan.io/api'],
    ['polygon', 'https://api.polygonscan.com/api'],
    ['polygon-mainnet', 'https://api.polygonscan.com/api'],
    ['rarible', 'https://mainnet.explorer.rarichain.org/api'],
    ['rarible-mainnet', 'https://mainnet.explorer.rarichain.org/api'],
    ['sepolia-testnet', 'https://api-sepolia.etherscan.io/api'],
    ['scroll', 'https://api.scrollscan.com/api'],
    ['scroll-mainnet', 'https://api.scrollscan.com/api'],
    ['sei', 'https://seitrace.com/pacific-1/api'],
    ['sei-mainnet', 'https://seitrace.com/pacific-1/api'],
    ['taiko', 'https://api.taikoscan.io/api'],
    ['taiko-mainnet', 'https://api.taikoscan.io/api'],
    ['xchain', 'https://xchain-explorer.idex.io/api'],
    ['xchain-mainnet', 'https://xchain-explorer.idex.io/api'],
    ['xlayer', 'https://www.oklink.com/api/v5/explorer/contract/verify-source-code-plugin/XLAYER'],
    ['xlayer-mainnet', 'https://www.oklink.com/api/v5/explorer/contract/verify-source-code-plugin/XLAYER'],
    ['zkatana', 'https://astar-zkevm.explorer.startale.com/api'],
    ['zkatana-mainnet', 'https://astar-zkevm.explorer.startale.com/api'],
    ['zkconsensys', 'https://api.lineascan.build/api'],
    ['zkconsensys-mainnet', 'https://api.lineascan.build/api'],
    ['zkpolygon', 'https://api-zkevm.polygonscan.com/api'],
    ['zkpolygon-mainnet', 'https://api-zkevm.polygonscan.com/api'],
])
