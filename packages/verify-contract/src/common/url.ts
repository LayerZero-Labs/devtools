// Etherscan API V2 base URL - works for all supported chains
// Re-export from networks config for consistency
export { ETHERSCAN_V2_URL as ETHERSCAN_V2_BASE_URL } from './networks'

// Re-export network lookup functions from the TypeScript-based loader
export { getDefaultScanApiUrl, getDefaultChainId } from './networks-loader'

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
