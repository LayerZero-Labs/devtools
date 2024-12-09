import type { OmniPointHardhat, OmniEdgeHardhat } from '@layerzerolabs/devtools-evm-hardhat'
import type { OAppEnforcedOption, OAppEdgeConfig } from '@layerzerolabs/ua-devtools'

const METADATA_URL = process.env.LZ_METADATA_URL || 'https://metadata.layerzero-api.com/v1/metadata'

interface IMetadata {
    [key: string]: {
        created: string
        updated: string
        tableName: string
        environment: string
        blockExplorers?: { url: string }[]
        deployments?: {
            eid: string
            chainKey: string
            stage: string
            version: number
            endpoint?: { address: string }
            relayerV2?: { address: string }
            ultraLightNodeV2?: { address: string }
            nonceContract?: { address: string }
            executor?: { address: string }
            deadDVN?: { address: string }
            endpointV2?: { address: string }
            sendUln302?: { address: string }
            lzExecutor?: { address: string }
            sendUln301?: { address: string }
            receiveUln301?: { address: string }
            receiveUln302?: { address: string }
        }[]
        chainDetails?: {
            chainType: string
            chainKey: string
            nativeChainId: number
            chainLayer: string
            chainStack?: string
            nativeCurrency: {
                name?: string
                symbol: string
                cgId?: string
                cmcId: number
                decimals: number
            }
            cgNetworkId?: string
            shortName?: string
            mainnetChainName?: string
            name?: string
        }
        dvns?: {
            [address: string]: {
                version: number
                canonicalName: string
                id: string
                deprecated?: boolean
                lzReadCompatible?: boolean
            }
        }
        rpcs?: { url: string; weight?: number }[]
        addressToOApp?: {
            [address: string]: {
                id: string
                canonicalName: string
                type?: string
            }
        }
        chainName: string
        tokens?: {
            [address: string]: {
                symbol: string
                cgId?: string
                cmcId?: number
                type: string
                decimals: number
                peggedTo?: {
                    symbol: string
                    chainName: string
                    address: string
                    programaticallyPegged?: boolean
                }
            }
        }
        chainKey: string
    }
}

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

function DVNsToAddresses(dvns: string[], chainKey: string, metadata: IMetadata) {
    if (dvns.length === 0) {
        return []
    }

    if (dvns[0]?.includes('0x')) {
        return dvns.sort()
    }

    const dvnAddresses: string[] = []

    if (!metadata[chainKey]?.dvns) {
        throw new Error(`Can't find DVNs for chainKey: "${chainKey}".`)
    }

    const metadataDVNs = Object.entries(metadata[chainKey].dvns)

    for (const dvn of dvns) {
        for (const [dvnAddress, dvnDetails] of metadataDVNs) {
            if (dvnDetails.canonicalName === dvn && !dvnDetails.lzReadCompatible) {
                dvnAddresses.push(dvnAddress)
                break
            }
        }
    }

    if (dvns.length !== dvnAddresses.length) {
        throw new Error(`Can't find all DVNs: "${dvns.join(', ')}",`)
    }

    return dvnAddresses.sort()
}

// [srcContract, dstContract, [requiredDVNs, [optionalDVNs, threshold]], [srcToDstConfirmations, dstToSrcConfirmations]], [enforcedOptionsSrcToDst, enforcedOptionsDstToSrc]
export type TwoWayConfig = [
    OmniPointHardhat,
    OmniPointHardhat,
    [string[], [string[], number] | []],
    [number, number | undefined],
    [OAppEnforcedOption[] | undefined, OAppEnforcedOption[] | undefined],
]

async function translatePathwayToConfig(
    pathway: TwoWayConfig,
    metadata: IMetadata
): Promise<OmniEdgeHardhat<OAppEdgeConfig | undefined>[]> {
    const configs: OmniEdgeHardhat<OAppEdgeConfig | undefined>[] = []

    const sourceContract = pathway[0]
    const destinationContract = pathway[1]
    const [requiredDVNs, optionalDVNConfig] = pathway[2]
    const [sourceToDestinationConfirmations, destinationToSourceConfirmations] = pathway[3]
    const [enforcedOptionsSrcToDst, enforcedOptionsDstToSrc] = pathway[4]

    const optionalDVNs = optionalDVNConfig[0]
    const optionalDVNThreshold = optionalDVNConfig[1] || 0

    if (optionalDVNThreshold > (optionalDVNs?.length || 0)) {
        throw new Error(`Optional DVN threshold is greater than the number of optional DVNs.`)
    }

    const sourceLZDeployment = getEndpointIdDeployment(sourceContract.eid, metadata)
    const destinationLZDeployment = getEndpointIdDeployment(destinationContract.eid, metadata)

    if (sourceLZDeployment.chainKey.startsWith('solana') || destinationLZDeployment.chainKey.startsWith('solana')) {
        throw new Error(
            'Solana is not supported in this version of the config generator. Use the "simple-config-generator.solana.ts" file instead.'
        )
    }

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
                    executor: sourceLZDeployment.executor.address,
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
                executor: destinationLZDeployment.executor.address,
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

export async function generateConnectionsConfig(pathways: TwoWayConfig[]) {
    const metadata = (await fetch(METADATA_URL).then((res) => res.json())) as IMetadata
    const connections: OmniEdgeHardhat<OAppEdgeConfig | undefined>[] = []

    for (const pathway of pathways) {
        connections.push(...(await translatePathwayToConfig(pathway, metadata)))
    }

    return connections
}
