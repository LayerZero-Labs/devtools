import type { OmniEdgeHardhat } from '@layerzerolabs/devtools-evm-hardhat'
import type { OAppEdgeConfig } from '@layerzerolabs/ua-devtools'
import { IMetadata } from './types'
import { TwoWayConfig } from './types'
import fs from 'fs/promises'
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

function isSolanaDeployment(deployment: { chainKey: string; executor?: { pda?: string; address?: string } }) {
    return deployment.chainKey.startsWith('solana')
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

    const optionalDVNs = optionalDVNConfig[0]
    const optionalDVNThreshold = optionalDVNConfig[1] || 0

    if (optionalDVNThreshold > (optionalDVNs?.length || 0)) {
        throw new Error(`Optional DVN threshold is greater than the number of optional DVNs.`)
    }

    const sourceLZDeployment = getEndpointIdDeployment(sourceContract.eid, metadata)
    const destinationLZDeployment = getEndpointIdDeployment(destinationContract.eid, metadata)

    const sourceExecutor = isSolanaDeployment(sourceLZDeployment)
        ? sourceLZDeployment.executor?.pda
        : sourceLZDeployment.executor?.address

    if (!sourceExecutor) {
        throw new Error(`Can't find executor for source endpoint with eid: "${sourceContract.eid}".`)
    }

    const sourceRequiredDVNs = DVNsToAddresses(requiredDVNs, sourceLZDeployment.chainKey, metadata)
    const destinationRequiredDVNs = DVNsToAddresses(requiredDVNs, destinationLZDeployment.chainKey, metadata)

    let sourceOptionalDVNs: string[] = []
    let destinationOptionalDVNs: string[] = []

    if (optionalDVNs) {
        sourceOptionalDVNs = DVNsToAddresses(optionalDVNs, sourceLZDeployment.chainKey, metadata)
        destinationOptionalDVNs = DVNsToAddresses(optionalDVNs, destinationLZDeployment.chainKey, metadata)
    }

    function getUlnLibraries(deployment: any, eid: number) {
        const send = deployment.sendUln302?.address || deployment.sendUln301?.address
        const receive = deployment.receiveUln302?.address || deployment.receiveUln301?.address
        if (!send || !receive) {
            throw new Error(
                `Can't find sendUln302/sendUln301 or receiveUln302/receiveUln301 for endpoint with eid: "${eid}".`
            )
        }
        return { send, receive }
    }

    if (!sourceLZDeployment.executor) {
        throw new Error(`Can't find executor for source endpoint with eid: "${sourceContract.eid}".`)
    }

    if (!destinationLZDeployment.executor) {
        throw new Error(`Can't find executor for destination endpoint with eid: "${destinationContract.eid}".`)
    }

    const sourceLibraries = getUlnLibraries(sourceLZDeployment, sourceContract.eid)
    const destinationLibraries = getUlnLibraries(destinationLZDeployment, destinationContract.eid)

    const sourceToDestinationConfig: OmniEdgeHardhat<OAppEdgeConfig> = {
        from: sourceContract,
        to: destinationContract,
        config: {
            sendLibrary: sourceLibraries.send,
            receiveLibraryConfig: {
                receiveLibrary: sourceLibraries.receive,
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
            sendLibrary: destinationLibraries.send,
            receiveLibraryConfig: {
                receiveLibrary: destinationLibraries.receive,
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
        const destinationExecutor = isSolanaDeployment(destinationLZDeployment)
            ? destinationLZDeployment.executor?.pda
            : destinationLZDeployment.executor?.address

        if (!destinationExecutor) {
            throw new Error(`Can't find executor for destination endpoint with eid: "${destinationContract.eid}".`)
        }

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
    if (metadataUrl.startsWith('file://')) {
        const url = new URL(metadataUrl)
        const data = await fs.readFile(url, 'utf8')
        return JSON.parse(data) as IMetadata
    }

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
