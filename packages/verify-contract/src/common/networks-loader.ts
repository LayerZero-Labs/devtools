import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { parse } from 'yaml'
import { type NetworkName } from './types'

interface NetworkConfigYaml {
    chainId: number
    apiUrl?: string
    aliases?: string[]
}

interface NetworksYaml {
    etherscanV2Url: string
    networks: Record<string, NetworkConfigYaml>
}

class NetworkRegistry {
    private apiUrls: Map<NetworkName, string> = new Map()
    private chainIds: Map<NetworkName, number> = new Map()

    constructor(yamlPath: string) {
        const yamlContent = readFileSync(yamlPath, 'utf8')
        const config: NetworksYaml = parse(yamlContent)

        // Process each network
        for (const [canonicalName, network] of Object.entries(config.networks)) {
            const apiUrl = network.apiUrl
            const chainId = network.chainId

            // Register canonical name
            if (apiUrl) {
                this.apiUrls.set(canonicalName, apiUrl)
            }
            if (chainId) {
                this.chainIds.set(canonicalName, chainId)
            }

            // Register all aliases pointing to the same values
            if (network.aliases) {
                for (const alias of network.aliases) {
                    if (apiUrl) {
                        this.apiUrls.set(alias, apiUrl)
                    }
                    if (chainId) {
                        this.chainIds.set(alias, chainId)
                    }
                }
            }
        }
    }

    getApiUrl(networkName: NetworkName): string | undefined {
        return this.apiUrls.get(networkName)
    }

    getChainId(networkName: NetworkName): number | undefined {
        return this.chainIds.get(networkName)
    }

    getAllNetworkNames(): string[] {
        return Array.from(new Set([...this.apiUrls.keys(), ...this.chainIds.keys()]))
    }

    getSupportedNetworks(): Map<NetworkName, { chainId?: number; apiUrl?: string }> {
        const networks = new Map<NetworkName, { chainId?: number; apiUrl?: string }>()

        const allNames = this.getAllNetworkNames()
        for (const name of allNames) {
            networks.set(name, {
                chainId: this.getChainId(name),
                apiUrl: this.getApiUrl(name),
            })
        }

        return networks
    }
}

// Load the networks configuration
// Try two locations:
// 1. Development: src/common/networks.yaml (__dirname is src/common/)
// 2. Production: dist/common/networks.yaml (__dirname is dist/ after bundling)
const devPath = join(__dirname, 'networks.yaml')
const prodPath = join(__dirname, 'common', 'networks.yaml')
const networksYamlPath = existsSync(devPath) ? devPath : prodPath
const networkRegistry = new NetworkRegistry(networksYamlPath)

// Export lookup functions (backward compatible with existing code)
export const getDefaultScanApiUrl = (networkName: string): string | undefined => networkRegistry.getApiUrl(networkName)

export const getDefaultChainId = (networkName: string): number | undefined => networkRegistry.getChainId(networkName)

// Export the registry for advanced use cases
export { networkRegistry }
