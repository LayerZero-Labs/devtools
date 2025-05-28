import { Contract, utils, constants } from 'ethers'

import { diffPrinter } from '../../shared/utils'
import { createDiffMessage, printAlreadySet, printNotSet, logPathwayHeader } from '../../shared/messageBuilder'
import type { OmniContractMetadataMapping, EidTxMap, RecvLibParam, address, eid } from '../utils/types'
import type { OAppEdgeConfig } from '@layerzerolabs/toolbox-hardhat'

const error_LZ_DefaultReceiveLibUnavailable = '0x78e84d0'

/**
 * @notice Generates setReceiveLibrary transaction per Eid's OFT.
 * @dev Fetches the current receiveLibrary from EndpointV2
 * @dev Sets the new receiveLibrary on the EndpointV2.
 * @dev The zero address != current default receive library
 * @dev - Zero Address is an abstraction to a variable receive library configurable by LZ.
 * @dev - The "value" of the current default receiveLibrary is a fixed value that is invariant on LZ changing the default receive library.
 * @returns EidTxMap
 */
export async function createSetReceiveLibraryTransactions(
    eidDataMapping: OmniContractMetadataMapping
): Promise<EidTxMap> {
    const txTypePool: EidTxMap = {}
    logPathwayHeader('setReceiveLibrary')

    for (const [eid, { peers, address, contract, configOapp }] of Object.entries(eidDataMapping)) {
        for (const peer of peers) {
            const { eid: peerToEid } = peer
            if (configOapp?.receiveLibraryConfig === undefined) {
                printNotSet('receive library - not found in config', Number(eid), Number(peerToEid))
                continue
            }

            const { currReceiveLibrary, newReceiveLibrary } = await parseReceiveLibrary(
                configOapp.receiveLibraryConfig,
                contract.epv2,
                address.oapp,
                peerToEid
            )

            if (newReceiveLibrary === '') {
                printNotSet('receive library - set to null', Number(eid), Number(peerToEid))
                continue
            }

            if (currReceiveLibrary === newReceiveLibrary) {
                printAlreadySet('receive library', Number(eid), Number(peerToEid))
                continue
            }
            const receiveLibraryGracePeriod = configOapp.receiveLibraryConfig.gracePeriod

            diffPrinter(
                createDiffMessage('receive library', Number(eid), Number(peerToEid)),
                { receiveLibrary: currReceiveLibrary },
                { receiveLibrary: newReceiveLibrary }
            )

            const tx = await contract.epv2.populateTransaction.setReceiveLibrary(
                address.oapp,
                peerToEid,
                newReceiveLibrary,
                receiveLibraryGracePeriod
            )

            txTypePool[eid] = txTypePool[eid] ?? []
            txTypePool[eid].push({
                toEid: peerToEid,
                populatedTx: tx,
            })
        }
    }

    return txTypePool
}

export async function parseReceiveLibrary(
    receiveLib: OAppEdgeConfig['receiveLibraryConfig'] | undefined,
    epv2: Contract,
    oappAddress: address,
    eid: eid
): Promise<{ currReceiveLibrary: string; newReceiveLibrary: string }> {
    if (receiveLib === undefined || receiveLib.receiveLibrary === undefined) {
        const currReceiveLibrary = await getDefaultReceiveLibrary(epv2, eid)

        return {
            currReceiveLibrary,
            newReceiveLibrary: '',
        }
    }

    const currReceiveLibrary = await getReceiveLibrary(epv2, oappAddress, eid)

    const newReceiveLibrary = utils.getAddress(receiveLib.receiveLibrary)

    return { currReceiveLibrary, newReceiveLibrary }
}

export async function getReceiveLibrary(epv2Contract: Contract, evmAddress: string, peerEid: eid): Promise<string> {
    const recvLibParam: RecvLibParam = await epv2Contract.getReceiveLibrary(evmAddress, peerEid)
    if (recvLibParam.isDefault) {
        return constants.AddressZero
    }

    const recvLib = recvLibParam.lib
    if (recvLib === error_LZ_DefaultReceiveLibUnavailable) {
        return constants.AddressZero
    }

    const recvLibAddress = utils.getAddress(recvLib)

    return recvLibAddress
}

export async function getDefaultReceiveLibrary(epv2Contract: Contract, peerEid: eid): Promise<string> {
    const recvLib = await epv2Contract.defaultReceiveLibrary(peerEid)

    const recvLibAddress = utils.getAddress(recvLib)

    return recvLibAddress
}
