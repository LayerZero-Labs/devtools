import { type Logger } from '@layerzerolabs/io-devtools'
import type { NetworkConfig, NetworkName } from './types'
import { getDefaultScanApiUrl, getDefaultChainId, tryGetScanBrowserUrlFromScanUrl } from './url'
import assert from 'assert'
import { COLORS } from './logger'
import chalk from 'chalk'

export const parseNetworksConfig = (
    logger: Logger,
    partialNetworksConfig: Record<NetworkName, Partial<NetworkConfig>> | null | undefined
): Record<NetworkName, NetworkConfig> => {
    return Object.entries(partialNetworksConfig ?? {}).reduce((networksConfig, [networkName, networkConfig]) => {
        // In case the config is not defined let's just go to the next one
        if (networkConfig == null) {
            return networksConfig
        }

        // The API URL can either be specified:
        //
        // - explicitly in the network config
        // - explicitly using an environment variable
        // - implicitly by using the default value
        const apiUrl = networkConfig.apiUrl || getScanApiUrlFromEnv(networkName) || getDefaultScanApiUrl(networkName)

        // Unfortunately when API URL is not specified we just fail fail fail
        assert(
            apiUrl,
            COLORS.error`Missing scan API URL for network ${COLORS.default(networkName)}
      
Please provide the API URL:

- As an apiUrl config parameter in ${networkName} config
- As a SCAN_API_URL_${networkName} environment variable
- As a SCAN_API_URL_${normalizeNetworkName(networkName)} environment variable
`
        )

        // API key on the other hand is optional so if it's not there we just let the user know and move on
        const apiKey = networkConfig.apiKey || getScanApiKeyFromEnv(networkName)
        if (!apiKey) {
            logger.debug(`Could not find scan API key for network ${chalk.bold(networkName)}
        
Please provide the API key:

- As an apiKey config parameter in ${networkName} config
- As a SCAN_API_KEY_${networkName} environment variable
- As a SCAN_API_KEY_${normalizeNetworkName(networkName)} environment variable`)
        }

        // Similar thing goes for scan browser URL, if not provided then life goes on
        // but eyebrows will be raised
        const browserUrl =
            networkConfig.browserUrl || getScanBrowserUrlFromEnv(networkName) || tryGetScanBrowserUrlFromScanUrl(apiUrl)
        if (!browserUrl) {
            logger.debug(`Could not find scan browser URL key for network ${chalk.bold(networkName)}

  Browser URL is used to display a link to the verified contract
  after successful verification.
          
  Please provide the browser URL:
  
  - As an browserUrl config parameter in ${networkName} config
  - As a SCAN_BROWSER_URL_${networkName} environment variable
  - As a SCAN_BROWSER_URL_${normalizeNetworkName(networkName)} environment variable`)
        }

        // Chain ID can be specified explicitly or retrieved from defaults
        // For Etherscan API v2, this is required
        const chainId = networkConfig.chainId || getChainIdFromEnv(networkName) || getDefaultChainId(networkName)
        if (!chainId) {
            logger.debug(`Could not find chain ID for network ${chalk.bold(networkName)}

  Chain ID is required for Etherscan API v2.

  Please provide the chain ID:
 
  - As a chainId config parameter in ${networkName} config
  - As a SCAN_CHAIN_ID_${networkName} environment variable
  - As a SCAN_CHAIN_ID_${normalizeNetworkName(networkName)} environment variable`)
        }

        return {
            ...networksConfig,
            [networkName]: { apiUrl, apiKey, browserUrl, chainId },
        }
    }, {})
}

const getScanApiUrlFromEnv = (networkName: NetworkName): string | undefined =>
    process.env[`SCAN_API_URL_${networkName}`]?.trim() ||
    process.env[`SCAN_API_URL_${normalizeNetworkName(networkName)}`]?.trim()

const getScanBrowserUrlFromEnv = (networkName: NetworkName): string | undefined =>
    process.env[`SCAN_BROWSER_URL_${networkName}`]?.trim() ||
    process.env[`SCAN_BROWSER_URL_${normalizeNetworkName(networkName)}`]?.trim()

const getScanApiKeyFromEnv = (networkName: NetworkName): string | undefined =>
    process.env[`SCAN_API_KEY_${networkName}`]?.trim() ||
    process.env[`SCAN_API_KEY_${normalizeNetworkName(networkName)}`]?.trim()

const getChainIdFromEnv = (networkName: NetworkName): number | undefined => {
    const chainIdStr =
        process.env[`SCAN_CHAIN_ID_${networkName}`]?.trim() ||
        process.env[`SCAN_CHAIN_ID_${normalizeNetworkName(networkName)}`]?.trim()
    return chainIdStr ? parseInt(chainIdStr, 10) : undefined
}

const normalizeNetworkName = (networkName: NetworkName): string => networkName.toUpperCase().replaceAll('-', '_')
