import type { OmniEdgeHardhat } from '@layerzerolabs/devtools-evm-hardhat'
import type { OAppEdgeConfig } from '@layerzerolabs/ua-devtools'
import { BlockConfirmationsDefinition, BlockConfirmationsType, IMetadata } from './types'
import { TwoWayConfig } from './types'
import {
    METADATA_KEY_EVM_BLOCKED_MESSAGE,
    METADATA_KEY_SOLANA_BLOCKED_MESSAGE,
    METADATA_KEY_RECEIVE_LIBRARY,
    METADATA_KEY_SEND_LIBRARY,
    METADATA_URL,
    MSG_LIB_BLOCK_RECEIVE_ONLY,
    MSG_LIB_BLOCK_SEND_AND_RECEIVE,
    MSG_LIB_BLOCK_SEND_ONLY,
    NIL_DVN_COUNT,
} from './constants'
import { getAddress } from '@ethersproject/address'

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

function isNonEvmDeployment(deployment: { chainKey: string }) {
    return ['solana', 'sui', 'starknet', 'aptos', 'ton'].some((prefix) => deployment.chainKey.startsWith(prefix))
}

const maybeChecksumAddress = (address: string) => {
    if (!address) {
        return address
    }
    if (!address.startsWith('0x')) {
        return address
    }
    if (address.length !== 42) {
        return address
    }
    return getAddress(address)
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

// Helper to resolve library metadata key based on operation and chain
function resolveLibraryMetadataKey(isSend: boolean, isBlocked: boolean, deployment: { chainKey: string }) {
    if (isBlocked) {
        if (isSolanaDeployment(deployment)) {
            return METADATA_KEY_SOLANA_BLOCKED_MESSAGE
        }

        return METADATA_KEY_EVM_BLOCKED_MESSAGE
    }
    return isSend ? METADATA_KEY_SEND_LIBRARY : METADATA_KEY_RECEIVE_LIBRARY
}

// Helper to assert presence of a metadata key on a deployment
function assertHasKey(deployment: Record<string, any>, key: string, eid: number) {
    if (!deployment[key]) {
        throw new Error(`Can't find ${key} for endpoint with eid: "${eid}".`)
    }
}

function isBlocked(blockConfirmationsDefinition: BlockConfirmationsDefinition | undefined, isSend: boolean): boolean {
    const keys = [MSG_LIB_BLOCK_SEND_AND_RECEIVE, isSend ? MSG_LIB_BLOCK_SEND_ONLY : MSG_LIB_BLOCK_RECEIVE_ONLY]

    return Boolean(
        blockConfirmationsDefinition &&
            typeof blockConfirmationsDefinition === 'object' &&
            keys.includes(blockConfirmationsDefinition[1])
    )
}

const getLibraryAddress = (deployment: any, metadataKey: string) => {
    const address = deployment[metadataKey].address
    if (isNonEvmDeployment(deployment)) {
        return address
    }
    return maybeChecksumAddress(address)
}

export async function translatePathwayToConfig(
    pathway: TwoWayConfig,
    metadata: IMetadata,
    skipFromEids: Set<number> = new Set()
): Promise<OmniEdgeHardhat<OAppEdgeConfig | undefined>[]> {
    const configs: OmniEdgeHardhat<OAppEdgeConfig | undefined>[] = []

    const AContract = pathway[0]
    const BContract = pathway[1]
    const [requiredDVNs, optionalDVNConfig] = pathway[2]
    const [AToBConfirmationsDefinition, BToAConfirmationsDefinition] = pathway[3]
    const [enforcedOptionsAToB, enforcedOptionsBToA] = pathway[4]
    const customExecutor = pathway[5]

    // Determine which directions to generate based on skipFromEids
    const generateAToB = !skipFromEids.has(AContract.eid)
    const generateBToA = !skipFromEids.has(BContract.eid)

    // If both directions are skipped, nothing to do
    if (!generateAToB && !generateBToA) {
        return configs
    }

    const optionalDVNs = optionalDVNConfig[0]
    const optionalDVNThreshold = optionalDVNConfig[1] || 0

    if (optionalDVNThreshold > (optionalDVNs?.length || 0)) {
        throw new Error(`Optional DVN threshold is greater than the number of optional DVNs.`)
    }

    const requiredDVNCount = requiredDVNs.length > 0 ? requiredDVNs.length : NIL_DVN_COUNT

    // Only look up deployment/DVNs/executor for chains we're generating configs for
    const ALZDeployment = generateAToB ? getEndpointIdDeployment(AContract.eid, metadata) : undefined
    const BLZDeployment = generateBToA ? getEndpointIdDeployment(BContract.eid, metadata) : undefined

    // A chain lookups (only needed for A→B config)
    let ARequiredDVNs: string[] = []
    let AOptionalDVNs: string[] = []
    let AExecutor: string | undefined
    if (generateAToB && ALZDeployment) {
        AExecutor = resolveExecutorForDeployment(customExecutor, ALZDeployment, metadata, AContract.eid)
        ARequiredDVNs = DVNsToAddresses(requiredDVNs, ALZDeployment.chainKey, metadata)
        if (optionalDVNs) {
            AOptionalDVNs = DVNsToAddresses(optionalDVNs, ALZDeployment.chainKey, metadata)
        }
    }

    // B chain lookups (only needed for B→A config)
    let BRequiredDVNs: string[] = []
    let BOptionalDVNs: string[] = []
    if (generateBToA && BLZDeployment) {
        BRequiredDVNs = DVNsToAddresses(requiredDVNs, BLZDeployment.chainKey, metadata)
        if (optionalDVNs) {
            BOptionalDVNs = DVNsToAddresses(optionalDVNs, BLZDeployment.chainKey, metadata)
        }
    }

    const AToBConfirmations: BlockConfirmationsType = ['bigint', 'number'].includes(typeof AToBConfirmationsDefinition)
        ? AToBConfirmationsDefinition
        : AToBConfirmationsDefinition[0]
    const BToAConfirmations: BlockConfirmationsType | undefined = ['bigint', 'number'].includes(
        typeof BToAConfirmationsDefinition
    )
        ? BToAConfirmationsDefinition
        : BToAConfirmationsDefinition?.[0]

    // Generate A→B config if not skipped
    if (generateAToB && ALZDeployment && AExecutor) {
        const blockSendAToB = isBlocked(AToBConfirmationsDefinition, true)
        const blockReceiveBToA = isBlocked(BToAConfirmationsDefinition, false)

        const sendLibraryAToBMetadataKey = resolveLibraryMetadataKey(true, blockSendAToB, ALZDeployment)
        const receiveLibraryBToAMetadataKey = resolveLibraryMetadataKey(false, blockReceiveBToA, ALZDeployment)

        assertHasKey(ALZDeployment, sendLibraryAToBMetadataKey, AContract.eid)
        assertHasKey(ALZDeployment, receiveLibraryBToAMetadataKey, AContract.eid)

        const sendLibraryAToB = getLibraryAddress(ALZDeployment, sendLibraryAToBMetadataKey)
        const receiveLibraryBToA = getLibraryAddress(ALZDeployment, receiveLibraryBToAMetadataKey)

        const AToBConfig: OmniEdgeHardhat<OAppEdgeConfig> = {
            from: AContract,
            to: BContract,
            config: {
                sendLibrary: sendLibraryAToB,
                receiveLibraryConfig: {
                    receiveLibrary: receiveLibraryBToA,
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

        if (BToAConfirmations) {
            AToBConfig.config.receiveConfig = {
                ulnConfig: {
                    confirmations: BigInt(BToAConfirmations),
                    requiredDVNs: ARequiredDVNs,
                    requiredDVNCount,
                    optionalDVNs: AOptionalDVNs,
                    optionalDVNThreshold,
                },
            }
        }

        configs.push(AToBConfig)
    }

    // Generate B→A config if not skipped
    if (generateBToA && BLZDeployment) {
        const blockReceiveAToB = isBlocked(AToBConfirmationsDefinition, false)
        const blockSendBToA = isBlocked(BToAConfirmationsDefinition, true)

        const receiveLibraryAToBMetadataKey = resolveLibraryMetadataKey(false, blockReceiveAToB, BLZDeployment)
        const sendLibraryBToAMetadataKey = resolveLibraryMetadataKey(true, blockSendBToA, BLZDeployment)

        assertHasKey(BLZDeployment, receiveLibraryAToBMetadataKey, BContract.eid)
        assertHasKey(BLZDeployment, sendLibraryBToAMetadataKey, BContract.eid)

        const receiveLibraryAToB = getLibraryAddress(BLZDeployment, receiveLibraryAToBMetadataKey)
        const sendLibraryBToA = getLibraryAddress(BLZDeployment, sendLibraryBToAMetadataKey)

        const BToAConfig: OmniEdgeHardhat<OAppEdgeConfig> = {
            from: BContract,
            to: AContract,
            config: {
                sendLibrary: sendLibraryBToA,
                receiveLibraryConfig: {
                    receiveLibrary: receiveLibraryAToB,
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

        configs.push(BToAConfig)
    }

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
        /**
         * Skip generating connection configs that originate FROM these endpoint IDs.
         * This allows filtering out directions before DVN/executor lookups occur,
         * which is useful when some chains don't have DVNs in the metadata.
         */
        skipFromEids?: number[]
    }
) {
    const fetchMetadata = params?.fetchMetadata || defaultFetchMetadata
    const skipFromEids = new Set(params?.skipFromEids ?? [])
    const metadata = await fetchMetadata()
    const connections: OmniEdgeHardhat<OAppEdgeConfig | undefined>[] = []

    for (const pathway of pathways) {
        connections.push(...(await translatePathwayToConfig(pathway, metadata, skipFromEids)))
    }

    return connections
}
