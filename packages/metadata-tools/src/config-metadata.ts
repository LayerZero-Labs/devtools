import type { OmniEdgeHardhat } from '@layerzerolabs/devtools-evm-hardhat'
import type { OAppEdgeConfig } from '@layerzerolabs/ua-devtools'
import { BlockConfirmationsType, IMetadata } from './types'
import { TwoWayConfig } from './types'
import { BLOCKED_MESSAGE_LIB_INDICATOR, METADATA_URL, NIL_DVN_COUNT } from './constants'

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

    const AContract = pathway[0]
    const BContract = pathway[1]
    const [requiredDVNs, optionalDVNConfig] = pathway[2]
    const [AToBConfirmationsDefinition, BToAConfirmationsDefinition] = pathway[3]
    const [enforcedOptionsAToB, enforcedOptionsBToA] = pathway[4]
    const customExecutor = pathway[5]

    const optionalDVNs = optionalDVNConfig[0]
    const optionalDVNThreshold = optionalDVNConfig[1] || 0

    if (optionalDVNThreshold > (optionalDVNs?.length || 0)) {
        throw new Error(`Optional DVN threshold is greater than the number of optional DVNs.`)
    }

    const ALZDeployment = getEndpointIdDeployment(AContract.eid, metadata)
    const BLZDeployment = getEndpointIdDeployment(BContract.eid, metadata)

    const AExecutor = resolveExecutorForDeployment(customExecutor, ALZDeployment, metadata, AContract.eid)

    const ARequiredDVNs = DVNsToAddresses(requiredDVNs, ALZDeployment.chainKey, metadata)
    const BRequiredDVNs = DVNsToAddresses(requiredDVNs, BLZDeployment.chainKey, metadata)
    const requiredDVNCount = requiredDVNs.length > 0 ? requiredDVNs.length : NIL_DVN_COUNT

    let AOptionalDVNs: string[] = []
    let BOptionalDVNs: string[] = []

    if (optionalDVNs) {
        AOptionalDVNs = DVNsToAddresses(optionalDVNs, ALZDeployment.chainKey, metadata)
        BOptionalDVNs = DVNsToAddresses(optionalDVNs, BLZDeployment.chainKey, metadata)
    }

    const AToBConfirmations: BlockConfirmationsType = ['bigint', 'number'].includes(typeof AToBConfirmationsDefinition)
        ? AToBConfirmationsDefinition
        : AToBConfirmationsDefinition[0]
    const BToAConfirmations: BlockConfirmationsType | undefined = ['bigint', 'number'].includes(
        typeof BToAConfirmationsDefinition
    )
        ? BToAConfirmationsDefinition
        : BToAConfirmationsDefinition?.[0]

    const blockSendAToB: boolean = Boolean(
        AToBConfirmationsDefinition &&
            !['bigint', 'number'].includes(typeof AToBConfirmationsDefinition) &&
            AToBConfirmationsDefinition[1] === BLOCKED_MESSAGE_LIB_INDICATOR
    )
    const blockSendBToA: boolean = Boolean(
        BToAConfirmationsDefinition &&
            !['bigint', 'number'].includes(typeof BToAConfirmationsDefinition) &&
            BToAConfirmationsDefinition[1] === BLOCKED_MESSAGE_LIB_INDICATOR
    )

    const sendLibraryAToBMetadataKey = blockSendAToB
        ? isSolanaDeployment(ALZDeployment)
            ? 'blocked_messagelib'
            : 'blockedMessageLib'
        : 'sendUln302'
    const sendLibraryBToAMetadataKey = blockSendBToA
        ? isSolanaDeployment(BLZDeployment)
            ? 'blocked_messagelib'
            : 'blockedMessageLib'
        : 'sendUln302'

    const receiveLibraryBFromAMetadataKey = blockSendAToB
        ? isSolanaDeployment(BLZDeployment)
            ? 'blocked_messagelib'
            : 'blockedMessageLib'
        : 'receiveUln302'
    const receiveLibraryAFromBMetadataKey = blockSendBToA
        ? isSolanaDeployment(ALZDeployment)
            ? 'blocked_messagelib'
            : 'blockedMessageLib'
        : 'receiveUln302'

    if (!ALZDeployment[sendLibraryAToBMetadataKey]) {
        throw new Error(`Can't find ${sendLibraryAToBMetadataKey} for endpoint with eid: "${AContract.eid}".`)
    }

    if (!ALZDeployment[receiveLibraryAFromBMetadataKey]) {
        throw new Error(`Can't find ${receiveLibraryAFromBMetadataKey} for endpoint with eid: "${AContract.eid}".`)
    }

    if (!BLZDeployment[sendLibraryBToAMetadataKey]) {
        throw new Error(`Can't find ${sendLibraryBToAMetadataKey} for endpoint with eid: "${BContract.eid}".`)
    }

    if (!BLZDeployment[receiveLibraryBFromAMetadataKey]) {
        throw new Error(`Can't find ${receiveLibraryBFromAMetadataKey} for endpoint with eid: "${BContract.eid}".`)
    }

    if (!ALZDeployment.executor) {
        throw new Error(`Can't find executor for endpoint with eid: "${AContract.eid}".`)
    }

    const sendLibraryAToB = ALZDeployment[sendLibraryAToBMetadataKey].address
    const receiveLibraryAFromB = ALZDeployment[receiveLibraryAFromBMetadataKey].address
    const sendLibraryBToA = BLZDeployment[sendLibraryBToAMetadataKey].address
    const receiveLibraryBFromA = BLZDeployment[receiveLibraryBFromAMetadataKey].address

    if (!BLZDeployment.executor) {
        throw new Error(`Can't find executor for endpoint with eid: "${BContract.eid}".`)
    }

    const AToBConfig: OmniEdgeHardhat<OAppEdgeConfig> = {
        from: AContract,
        to: BContract,
        config: {
            sendLibrary: sendLibraryAToB,
            receiveLibraryConfig: {
                receiveLibrary: receiveLibraryAFromB,
                gracePeriod: BigInt(0),
            },
            sendConfig: {
                executorConfig: {
                    maxMessageSize: 10000,
                    executor: AExecutor,
                },
                ulnConfig: {
                    confirmations: BigInt(AToBConfirmations),
                    requiredDVNs: ARequiredDVNs,
                    requiredDVNCount,
                    optionalDVNs: AOptionalDVNs,
                    optionalDVNThreshold,
                },
            },
            enforcedOptions: enforcedOptionsAToB,
        },
    }

    const BToAConfig: OmniEdgeHardhat<OAppEdgeConfig> = {
        from: BContract,
        to: AContract,
        config: {
            sendLibrary: sendLibraryBToA,
            receiveLibraryConfig: {
                receiveLibrary: receiveLibraryBFromA,
                gracePeriod: BigInt(0),
            },
            receiveConfig: {
                ulnConfig: {
                    confirmations: BigInt(AToBConfirmations),
                    requiredDVNs: BRequiredDVNs,
                    requiredDVNCount,
                    optionalDVNs: BOptionalDVNs,
                    optionalDVNThreshold,
                },
            },
        },
    }

    if (BToAConfirmations) {
        const BExecutor = resolveExecutorForDeployment(customExecutor, BLZDeployment, metadata, BContract.eid)

        AToBConfig.config.receiveConfig = {
            ulnConfig: {
                confirmations: BigInt(BToAConfirmations),
                requiredDVNs: ARequiredDVNs,
                requiredDVNCount,
                optionalDVNs: AOptionalDVNs,
                optionalDVNThreshold,
            },
        }

        BToAConfig.config.enforcedOptions = enforcedOptionsBToA

        BToAConfig.config.sendConfig = {
            executorConfig: {
                maxMessageSize: 10000,
                executor: BExecutor,
            },
            ulnConfig: {
                confirmations: BigInt(BToAConfirmations),
                requiredDVNs: BRequiredDVNs,
                requiredDVNCount,
                optionalDVNs: BOptionalDVNs,
                optionalDVNThreshold,
            },
        }
    }

    configs.push(AToBConfig)
    configs.push(BToAConfig)

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
