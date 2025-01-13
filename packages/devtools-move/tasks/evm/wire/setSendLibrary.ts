import { Contract, utils, constants } from 'ethers'

import { diffPrinter } from '../../shared/utils'

import type { OmniContractMetadataMapping, EidTxMap, address, eid } from '../utils/types'
import type { OAppEdgeConfig } from '@layerzerolabs/toolbox-hardhat'
import { createDiffMessage, printAlreadySet, printNotSet } from '../../shared/messageBuilder'
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
export async function createSetSendLibraryTransactions(eidDataMapping: OmniContractMetadataMapping): Promise<EidTxMap> {
    const txTypePool: EidTxMap = {}

    for (const [eid, { wireOntoOapps, address, contract, configOapp }] of Object.entries(eidDataMapping)) {
        for (const wireOntoOapp of wireOntoOapps) {
            const { eid: peerToEid } = wireOntoOapp
            if (!configOapp?.sendLibrary) {
                printNotSet('send library - not found in config', Number(eid), Number(peerToEid))
                continue
            }

            const { currSendLibrary, newSendLibrary } = await parseSendLibrary(
                configOapp.sendLibrary,
                contract.epv2,
                address.oapp,
                peerToEid
            )

            if (currSendLibrary === newSendLibrary) {
                printAlreadySet('send library', Number(eid), Number(peerToEid))
                continue
            }

            diffPrinter(
                createDiffMessage('send library', Number(eid), Number(peerToEid)),
                { sendLibrary: currSendLibrary },
                { sendLibrary: newSendLibrary }
            )

            const tx = await contract.epv2.populateTransaction.setSendLibrary(address.oapp, peerToEid, newSendLibrary)

            txTypePool[eid] = txTypePool[eid] ?? []
            txTypePool[eid].push(tx)
        }
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
    const isDefault = await epv2Contract.isDefaultSendLibrary(evmAddress, apnewSEid)
    if (isDefault) {
        return constants.AddressZero
    }

    const sendLib = await epv2Contract.getSendLibrary(evmAddress, apnewSEid)
    if (sendLib === error_LZ_DefaultSendLibUnavailable) {
        return constants.AddressZero
    }
    return utils.getAddress(sendLib)
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
