import type { OmniEdgeHardhat } from '@layerzerolabs/devtools-evm-hardhat'
import type { OAppEdgeConfig } from '@layerzerolabs/ua-devtools'
import { IMetadata } from './types'
import { TwoWayConfig } from './types'
import { METADATA_URL } from './constants'

function getEndpointIdDeployment(eid: number, metadata: IMetadata) {
    const srcEidString = eid.toString()
    for (const objectKey in metadata) {
        const entry = metadata[objectKey]

        if (typeof entry?.deployments !== 'undefined') {
            for (const deployment of entry.deployments) {
                if (srcEidString === deployment.eid) {
                    return deployment
                }
            }
        }
    }

    throw new Error(`Can't find endpoint with eid: "${eid}",`)
}

export function DVNsToAddresses(dvns: string[], chainKey: string, metadata: IMetadata) {
    if (dvns.length === 0) {
        return []
    }

    const dvnAddresses: string[] = []
    const seenDVNs = new Set<string>()

    if (!metadata[chainKey]?.dvns) {
        throw new Error(`Can't find DVNs for chainKey: "${chainKey}".`)
    }

    const metadataDVNs = Object.entries(metadata[chainKey].dvns)

    for (const dvn of dvns) {
        if (seenDVNs.has(dvn)) {
            throw new Error(`Duplicate DVN name found: "${dvn}".`)
        }
        seenDVNs.add(dvn)

        let i = 0
        for (const [dvnAddress, dvnDetails] of metadataDVNs) {
            if (
                !dvnDetails.deprecated &&
                dvnDetails.canonicalName === dvn &&
                !dvnDetails.lzReadCompatible &&
                dvnDetails.version === 2
            ) {
                dvnAddresses.push(dvnAddress)
                break
            }

            if (i === metadataDVNs.length - 1) {
                throw new Error(
                    `Can't find DVN: "${dvn}" on chainKey: "${chainKey}". Double check you're using valid DVN canonical name (not an address).`
                )
            }

            i++
        }
    }

    if (dvns.length !== dvnAddresses.length) {
        throw new Error(`Can't find all DVNs: "${dvns.join(', ')}".`)
    }

    return dvnAddresses.sort()
}

export function resolveExecutor(executorName: string, chainKey: string, metadata: IMetadata): string | null {
    // First check if it's already an address (starts with 0x)
    if (executorName.startsWith('0x')) {
        return executorName
    }

    if (!metadata[chainKey]?.executors) {
        // If no custom executors defined, return null
        return null
    }

    const metadataExecutors = Object.entries(metadata[chainKey].executors)

    for (const [executorAddress, executorDetails] of metadataExecutors) {
        if (
            !executorDetails.deprecated &&
            executorDetails.canonicalName === executorName &&
            executorDetails.version === 2
        ) {
            return executorAddress
        }
    }

    // If not found in custom executors, return null
    return null
}

function isSolanaDeployment(deployment: { chainKey: string; executor?: { pda?: string; address?: string } }) {
    return deployment.chainKey.startsWith('solana')
}

function resolveExecutorForDeployment(
    customExecutor: string | undefined,
    deployment: { chainKey: string; executor?: { pda?: string; address?: string } },
    metadata: IMetadata,
    endpointEid: number
): string {
    if (customExecutor) {
        // Use custom executor, resolving name to address if needed
        const resolved = resolveExecutor(customExecutor, deployment.chainKey, metadata)
        if (resolved) {
            return resolved
        }
        // If custom executor specified but not found in metadata, use it as-is (for backwards compatibility)
        return customExecutor
    }

    // Use default executor from deployment
    const defaultExecutor = isSolanaDeployment(deployment) ? deployment.executor?.pda : deployment.executor?.address

    if (!defaultExecutor) {
        throw new Error(`Can't find executor for endpoint with eid: "${endpointEid}".`)
    }

    return defaultExecutor
}

export async function translatePathwayToConfig(
    pathway: TwoWayConfig,
    metadata: IMetadata
): Promise<OmniEdgeHardhat<OAppEdgeConfig | undefined>[]> {
    const configs: OmniEdgeHardhat<OAppEdgeConfig | undefined>[] = []

    const sourceContract = pathway[0]
    const destinationContract = pathway[1]
    const [requiredDVNs, optionalDVNConfig] = pathway[2]
    const [sourceToDestinationConfirmations, destinationToSourceConfirmations] = pathway[3]
    const [enforcedOptionsSrcToDst, enforcedOptionsDstToSrc] = pathway[4]
    const customExecutor = pathway[5]

    const optionalDVNs = optionalDVNConfig[0]
    const optionalDVNThreshold = optionalDVNConfig[1] || 0

    if (optionalDVNThreshold > (optionalDVNs?.length || 0)) {
        throw new Error(`Optional DVN threshold is greater than the number of optional DVNs.`)
    }

    const sourceLZDeployment = getEndpointIdDeployment(sourceContract.eid, metadata)
    const destinationLZDeployment = getEndpointIdDeployment(destinationContract.eid, metadata)

    const sourceExecutor = resolveExecutorForDeployment(
        customExecutor,
        sourceLZDeployment,
        metadata,
        sourceContract.eid
    )

    const sourceRequiredDVNs = DVNsToAddresses(requiredDVNs, sourceLZDeployment.chainKey, metadata)
    const destinationRequiredDVNs = DVNsToAddresses(requiredDVNs, destinationLZDeployment.chainKey, metadata)

    let sourceOptionalDVNs: string[] = []
    let destinationOptionalDVNs: string[] = []

    if (optionalDVNs) {
        sourceOptionalDVNs = DVNsToAddresses(optionalDVNs, sourceLZDeployment.chainKey, metadata)
        destinationOptionalDVNs = DVNsToAddresses(optionalDVNs, destinationLZDeployment.chainKey, metadata)
    }

    if (!sourceLZDeployment.sendUln302 || !sourceLZDeployment.receiveUln302 || !sourceLZDeployment.executor) {
        throw new Error(
            `Can't find sendUln302, receiveUln302 or executor for source endpoint with eid: "${sourceContract.eid}".`
        )
    }

    if (
        !destinationLZDeployment.sendUln302 ||
        !destinationLZDeployment.receiveUln302 ||
        !destinationLZDeployment.executor
    ) {
        throw new Error(
            `Can't find sendUln302, receiveUln302 or executor for destination endpoint with eid: "${destinationContract.eid}".`
        )
    }

    const sourceToDestinationConfig: OmniEdgeHardhat<OAppEdgeConfig> = {
        from: sourceContract,
        to: destinationContract,
        config: {
            sendLibrary: sourceLZDeployment.sendUln302.address,
            receiveLibraryConfig: {
                receiveLibrary: sourceLZDeployment.receiveUln302.address,
                gracePeriod: BigInt(0),
            },
            sendConfig: {
                executorConfig: {
                    maxMessageSize: 10000,
                    executor: sourceExecutor,
                },
                ulnConfig: {
                    confirmations: BigInt(sourceToDestinationConfirmations),
                    requiredDVNs: sourceRequiredDVNs,
                    optionalDVNs: sourceOptionalDVNs,
                    optionalDVNThreshold,
                },
            },
            enforcedOptions: enforcedOptionsSrcToDst,
        },
    }

    const destinationToSourceConfig: OmniEdgeHardhat<OAppEdgeConfig> = {
        from: destinationContract,
        to: sourceContract,
        config: {
            sendLibrary: destinationLZDeployment.sendUln302.address,
            receiveLibraryConfig: {
                receiveLibrary: destinationLZDeployment.receiveUln302.address,
                gracePeriod: BigInt(0),
            },
            receiveConfig: {
                ulnConfig: {
                    confirmations: BigInt(sourceToDestinationConfirmations),
                    requiredDVNs: destinationRequiredDVNs,
                    optionalDVNs: destinationOptionalDVNs,
                    optionalDVNThreshold,
                },
            },
        },
    }

    if (destinationToSourceConfirmations) {
        const destinationExecutor = resolveExecutorForDeployment(
            customExecutor,
            destinationLZDeployment,
            metadata,
            destinationContract.eid
        )

        sourceToDestinationConfig.config.receiveConfig = {
            ulnConfig: {
                confirmations: BigInt(destinationToSourceConfirmations),
                requiredDVNs: sourceRequiredDVNs,
                optionalDVNs: sourceOptionalDVNs,
                optionalDVNThreshold,
            },
        }

        destinationToSourceConfig.config.enforcedOptions = enforcedOptionsDstToSrc

        destinationToSourceConfig.config.sendConfig = {
            executorConfig: {
                maxMessageSize: 10000,
                executor: destinationExecutor,
            },
            ulnConfig: {
                confirmations: BigInt(destinationToSourceConfirmations),
                requiredDVNs: destinationRequiredDVNs,
                optionalDVNs: destinationOptionalDVNs,
                optionalDVNThreshold,
            },
        }
    }

    configs.push(sourceToDestinationConfig)
    configs.push(destinationToSourceConfig)

    return configs
}

// allow for a custom metadataUrl
export async function defaultFetchMetadata(metadataUrl = METADATA_URL): Promise<IMetadata> {
    return (await fetch(metadataUrl).then((res) => res.json())) as IMetadata
}

// allow for a custom fetchMetadata
export async function generateConnectionsConfig(
    pathways: TwoWayConfig[],
    params?: {
        fetchMetadata?: () => Promise<IMetadata>
    }
) {
    const fetchMetadata = params?.fetchMetadata || defaultFetchMetadata
    const metadata = await fetchMetadata()
    const connections: OmniEdgeHardhat<OAppEdgeConfig | undefined>[] = []

    for (const pathway of pathways) {
        connections.push(...(await translatePathwayToConfig(pathway, metadata)))
    }

    return connections
}
