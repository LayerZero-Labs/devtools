import { Contract, utils } from 'ethers'

import { diffPrinter } from '../../shared/utils'
import { ZEROADDRESS_EVM } from '../utils/types'

import type { ContractMetadataMapping, EidTxMap, NonEvmOAppMetadata, address, eid } from '../utils/types'
import type { OAppEdgeConfig } from '@layerzerolabs/toolbox-hardhat'

const error_LZ_DefaultSendLibUnavailable = '0x6c1ccdb5'

/**
 * @notice Generates setSendLibrary transaction per Eid's OFT.
 * @dev Fetches the current sendLibrary from EndpointV2
 * @dev Sets the new sendLibrary on the EndpointV2.
 * @dev The zero address != current default send library
 * @dev - Zero Address is an abstraction to a variable send library configurable by LZ.
 * @dev - The "value" of the current default send library is a fixed value that is invariant on LZ changing the default send library.
 * @returns EidTxMap
 */
export async function createSetSendLibraryTransactions(
    eidDataMapping: ContractMetadataMapping,
    nonEvmOapp: NonEvmOAppMetadata
): Promise<EidTxMap> {
    const txTypePool: EidTxMap = {}

    for (const [eid, { address, contract, configOapp }] of Object.entries(eidDataMapping)) {
        if (!configOapp?.sendLibrary) {
            console.log(`\x1b[43m Skipping: No sendLibrary has been set for ${eid} @ ${address.oapp} \x1b[0m`)
            continue
        }

        const { currSendLibrary, newSendLibrary } = await parseSendLibrary(
            configOapp.sendLibrary,
            contract.epv2,
            address.oapp,
            nonEvmOapp.eid
        )

        if (currSendLibrary === newSendLibrary) {
            console.log(`\x1b[43m Skipping: sendLibrary is already set for ${eid} @ ${address.oapp} \x1b[0m`)
            continue
        }

        diffPrinter(`Setting Send Library on ${eid}`, { sendLibrary: currSendLibrary }, { sendLibrary: newSendLibrary })

        const tx = await contract.epv2.populateTransaction.setSendLibrary(address.oapp, nonEvmOapp.eid, newSendLibrary)

        txTypePool[eid] = txTypePool[eid] ?? []
        txTypePool[eid].push(tx)
    }

    return txTypePool
}

export async function parseSendLibrary(
    sendLib: OAppEdgeConfig['sendLibrary'] | undefined,
    epv2: Contract,
    oappAddress: address,
    eid: eid
): Promise<{ currSendLibrary: string; newSendLibrary: string }> {
    if (sendLib === undefined) {
        const currSendLibrary = await getDefaultSendLibrary(epv2, oappAddress, eid)
        return {
            currSendLibrary,
            newSendLibrary: '',
        }
    }

    const currSendLibrary = await getSendLibrary(epv2, oappAddress, eid)

    const newSendLibrary = utils.getAddress(sendLib)

    return { currSendLibrary, newSendLibrary }
}

export async function getSendLibrary(epv2Contract: Contract, evmAddress: string, apnewSEid: eid): Promise<string> {
    const sendLib = await epv2Contract.getSendLibrary(evmAddress, apnewSEid)

    if (sendLib === error_LZ_DefaultSendLibUnavailable) {
        return ZEROADDRESS_EVM
    }

    const sendLibAddress = utils.getAddress(sendLib)

    return sendLibAddress
}

export async function getDefaultSendLibrary(
    epv2Contract: Contract,
    evmAddress: string,
    apnewSEid: eid
): Promise<string> {
    const sendLib = await epv2Contract.getDefaultSendLibrary(evmAddress, apnewSEid)

    const sendLibAddress = utils.getAddress(sendLib)

    return sendLibAddress
}
