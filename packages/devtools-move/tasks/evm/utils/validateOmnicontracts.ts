import { ethers } from 'ethers'

import type { OmniContractMetadataMapping } from './types'
import { getNetworkForChainId } from '@layerzerolabs/lz-definitions'

export async function validateOmniContractsOrTerminate(omniContracts: OmniContractMetadataMapping) {
    let shouldNotTerminate = true
    shouldNotTerminate = shouldNotTerminate && (await validateRpcUrl(omniContracts))
    shouldNotTerminate = shouldNotTerminate && (await validateEidSupport(omniContracts))

    if (!shouldNotTerminate) {
        process.exit(1)
    }
    return shouldNotTerminate
}

export async function validateRpcUrl(omniContracts: OmniContractMetadataMapping): Promise<boolean> {
    let shouldNotTerminate = true
    const badRpcUrls: Record<string, string> = {}

    for (const [fromEid, { provider }] of Object.entries(omniContracts)) {
        let blockNumber = 0
        try {
            blockNumber = await getBlockNumber(provider)
        } catch (error) {
            blockNumber = 0
        }

        if (blockNumber === 0) {
            badRpcUrls[fromEid] = provider.connection.url
        }
    }

    if (Object.keys(badRpcUrls).length > 0) {
        console.error(
            `The following EIDs have an invalid RPC URL (block number returned by them is 0):\n${Object.entries(
                badRpcUrls
            )
                .map(([eid, url]) => `EID: ${eid}\t RPC URL: ${url}`)
                .join('\n')}`
        )
        shouldNotTerminate = false
    }

    return shouldNotTerminate
}

export async function validateEidSupport(omniContracts: OmniContractMetadataMapping): Promise<boolean> {
    let shouldNotTerminate = true
    const unsupportedEids: Record<string, string[]> = {}

    for (const [fromEid, { contract, peers }] of Object.entries(omniContracts)) {
        const epv2 = contract.epv2

        for (const peer of peers) {
            const peerEid = peer.eid

            let isSupported = false
            try {
                isSupported = await epv2.isSupportedEid(peerEid)
            } catch (error) {
                console.error(error)
                isSupported = false
            }

            if (!isSupported) {
                if (!unsupportedEids[fromEid]) {
                    unsupportedEids[fromEid] = []
                }
                unsupportedEids[fromEid].push(peerEid)
            }
        }
    }

    if (Object.keys(unsupportedEids).length > 0) {
        console.error(
            'The following EIDs are not supported by the EPV2 contract (endpointAddress::isSupportedEid(u32))'
        )
        for (const [fromEid, badEids] of Object.entries(unsupportedEids)) {
            const badNetworks = badEids.map((eid) => getNetworkForChainId(parseInt(eid)))
            const badNetworkNames = badNetworks.map((network) => `${network.chainName}-${network.env}`)
            const network = getNetworkForChainId(parseInt(fromEid))
            console.error(
                `${network.chainName}-${network.env}\t EndpointV2: ${omniContracts[fromEid].contract.epv2.address}\t Unsupported networks: ${badNetworkNames.join(', ')}`
            )
        }
        shouldNotTerminate = false
    }

    return shouldNotTerminate
}

export async function getBlockNumber(provider: ethers.providers.JsonRpcProvider): Promise<number> {
    return await provider.getBlockNumber()
}
