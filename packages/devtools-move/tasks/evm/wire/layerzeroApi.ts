export interface ChainDeployment {
    eid: string
    version?: string
    stage?: string
    addresses: Record<string, string>
}

export interface DVNInfo {
    version?: number
    canonicalName?: string
    id?: string
    deprecated?: boolean
}

export interface ChainInfo {
    chain_details: any
    deployments: ChainDeployment[]
    dvns: Record<string, DVNInfo>
}

export interface ApiChainData {
    [key: string]: ChainInfo
}

function getDeploymentAddresses(deployment: any): Record<string, string> {
    const addresses: Record<string, string> = {}

    const addressFields = [
        'endpoint',
        'endpointV2',
        'endpointV2View',
        'ultraLightNodeV2',
        'sendUln301',
        'receiveUln301',
        'sendUln302',
        'receiveUln302',
        'relayerV2',
        'executor',
        'lzExecutor',
        'nonceContract',
        'blockedMessageLib',
        'deadDVN',
    ]

    for (const field of addressFields) {
        if (deployment[field]?.address) {
            addresses[field] = deployment[field].address
        }
    }

    return addresses
}

function findChainInfoByName(
    chainNameFragment: string,
    data: Record<string, any>,
    isTestnet: boolean = false
): Record<string, ChainInfo> {
    const matches: Record<string, ChainInfo> = {}
    const searchTerm = chainNameFragment.toLowerCase()

    for (const [apiKey, chainData] of Object.entries(data)) {
        const apiKeyLower = apiKey.toLowerCase()

        if (!searchTerm || !apiKeyLower.includes(searchTerm)) {
            continue
        }

        const isKeyTestnet = apiKeyLower.includes('testnet')
        const isKeySandbox = apiKeyLower.includes('sandbox')

        if (isTestnet && !isKeyTestnet) {
            continue
        }
        if (!isTestnet && (isKeyTestnet || isKeySandbox)) {
            continue
        }

        const chainDeployments: ChainDeployment[] = []
        if (chainData.deployments && Array.isArray(chainData.deployments)) {
            for (const deployment of chainData.deployments) {
                if (!deployment.eid || typeof deployment.eid !== 'string' || deployment.eid.length !== 5) {
                    continue
                }

                chainDeployments.push({
                    eid: deployment.eid,
                    version: deployment.version,
                    stage: deployment.stage,
                    addresses: getDeploymentAddresses(deployment),
                })
            }
        }

        if (chainDeployments.length === 0) {
            continue
        }

        matches[apiKey] = {
            chain_details: chainData.chainDetails || {},
            deployments: chainDeployments,
            dvns: chainData.dvns || {},
        }
    }

    return matches
}

export async function getEndpointInfo(
    pathwayPairs: Array<[string, string]>,
    isTestnet: boolean = false
): Promise<Record<string, ChainInfo>> {
    const url = 'https://metadata.layerzero-api.com/v1/metadata/deployments'

    console.log(`Fetching LayerZero ${isTestnet ? 'testnet' : 'mainnet'} deployment data...`)

    const response = await fetch(url)
    if (!response.ok) {
        throw new Error(`Failed to fetch endpoint data: ${response.status}`)
    }

    const data = await response.json()
    console.log(`Processing endpoint info for ${pathwayPairs}`)

    const results: Record<string, ChainInfo> = {}
    const processedFragments = new Set<string>()

    for (const [sourceFragment, targetFragment] of pathwayPairs) {
        const fragmentsToProcess: string[] = []

        if (!processedFragments.has(sourceFragment)) {
            fragmentsToProcess.push(sourceFragment)
            processedFragments.add(sourceFragment)
        }

        if (!processedFragments.has(targetFragment)) {
            fragmentsToProcess.push(targetFragment)
            processedFragments.add(targetFragment)
        }

        for (const fragment of fragmentsToProcess) {
            console.log(`Finding ${isTestnet ? 'testnet' : 'mainnet'} matches for: '${fragment}'`)
            const matchesDict = findChainInfoByName(fragment, data, isTestnet)

            if (Object.keys(matchesDict).length === 0) {
                const networkType = isTestnet ? 'testnet' : 'mainnet'
                console.log(`Warning: Could not find any ${networkType} API keys containing '${fragment}'`)
            } else {
                Object.assign(results, matchesDict)
            }
        }
    }

    console.log(`Found ${Object.keys(results).length} matching chains:`)
    for (const apiKey of Object.keys(results).sort()) {
        console.log(`  - ${apiKey}`)
    }

    return results
}

export function getDVNNameByAddress(chainInfo: ChainInfo, dvnAddress: string): string | null {
    // The DVN address is the key in the dvns object, not a property of the value
    for (const [address, dvnInfo] of Object.entries(chainInfo.dvns)) {
        if (address.toLowerCase() === dvnAddress.toLowerCase()) {
            // Return the canonical name if available, otherwise the id
            if (typeof dvnInfo === 'object' && dvnInfo !== null) {
                return dvnInfo.canonicalName || dvnInfo.id || address
            }
            return address
        }
    }
    return null
}

export function getChainInfoByEid(data: Record<string, ChainInfo>, eid: string): ChainInfo | null {
    for (const chainInfo of Object.values(data)) {
        const deployment = chainInfo.deployments.find((d) => d.eid === eid)
        if (deployment) {
            return chainInfo
        }
    }
    return null
}

export interface DVNAddressName {
    address: string
    name: string
}

/**
 * Get DVN addresses and names by EID
 * @param eid - The endpoint ID (e.g., '30101' for Ethereum)
 * @param isTestnet - Whether to fetch testnet data (default: false)
 * @returns Array of DVN addresses and names
 */
export async function getDVNsByEid(eid: string, isTestnet: boolean = false): Promise<DVNAddressName[]> {
    // Fetch LayerZero deployment data
    const response = await fetch('https://metadata.layerzero-api.com/v1/metadata/deployments')
    if (!response.ok) {
        throw new Error(`Failed to fetch LayerZero data: ${response.status}`)
    }
    const data = await response.json()

    // Find the chain that has this EID
    for (const [chainKey, chainInfo] of Object.entries(data)) {
        const chainData = chainInfo as any
        const hasEid = chainData.deployments?.some((d: any) => d.eid === eid)

        if (!hasEid) {
            continue
        }

        // Check if network type matches (mainnet vs testnet)
        const isChainTestnet = chainKey.toLowerCase().includes('testnet') || chainKey.toLowerCase().includes('sandbox')
        if (isTestnet !== isChainTestnet) {
            continue
        }

        // Extract DVNs from this chain
        const dvns: DVNAddressName[] = []
        const chainDvns = chainData.dvns || {}

        for (const [address, dvnInfo] of Object.entries(chainDvns)) {
            const info = dvnInfo as any
            const name = info?.canonicalName || info?.id || address
            dvns.push({ address, name })
        }

        return dvns
    }

    return []
}
