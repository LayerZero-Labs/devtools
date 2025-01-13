import { Contract, utils, constants } from 'ethers'

import { diffPrinter } from '../../shared/utils'
import { createDiffMessage, printAlreadySet, printNotSet } from '../../shared/messageBuilder'
import type { OmniContractMetadataMapping, EidTxMap, RecvLibraryTimeoutConfig, eid } from '../utils/types'

/**
 * @notice Generates setReceiveLibraryTimeout transaction per Eid's OFT.
 * @dev Fetches the current receiveLibraryTimeout from EndpointV2
 * @dev Sets the new receiveLibraryTimeout on the EndpointV2.
 * @returns EidTxMap
 */
export async function createSetReceiveLibraryTimeoutTransactions(
    eidDataMapping: OmniContractMetadataMapping
): Promise<EidTxMap> {
    const txTypePool: EidTxMap = {}

    for (const [eid, { wireOntoOapps, address, contract, configOapp }] of Object.entries(eidDataMapping)) {
        for (const wireOntoOapp of wireOntoOapps) {
            const { eid: peerToEid } = wireOntoOapp

            if (configOapp?.receiveLibraryTimeoutConfig === undefined) {
                printNotSet('receive library timeout - not found in config', Number(eid), Number(peerToEid))
                continue
            }

            const defaultReceiveLibrary = await contract.epv2.getReceiveLibrary(contract.epv2.address, peerToEid)
            if (defaultReceiveLibrary.isDefault) {
                console.log('Can not set receive library timout to default library')
                continue
            }

            const currReceiveLibraryParam = await getReceiveLibraryTimeout(contract.epv2, address.oapp, peerToEid)
            const currReceiveLibrary = currReceiveLibraryParam.lib
            const currReceiveLibraryExpiry = Number(currReceiveLibraryParam.expiry)

            const newReceiveLibrary = utils.getAddress(configOapp.receiveLibraryTimeoutConfig.lib)
            const newReceiveLibraryExpiry = Number(configOapp.receiveLibraryTimeoutConfig.expiry)

            if (currReceiveLibrary === newReceiveLibrary && currReceiveLibraryExpiry === newReceiveLibraryExpiry) {
                printAlreadySet('receive library timeout', Number(eid), Number(peerToEid))
                continue
            }

            diffPrinter(
                createDiffMessage('receive library timeout', Number(eid), Number(peerToEid)),
                { lib: currReceiveLibrary, expiry: currReceiveLibraryExpiry },
                { lib: newReceiveLibrary, expiry: newReceiveLibraryExpiry }
            )

            const tx = await contract.epv2.populateTransaction.setReceiveLibraryTimeout(
                address.oapp,
                peerToEid,
                newReceiveLibrary,
                newReceiveLibraryExpiry
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

export async function getReceiveLibraryTimeout(
    epv2Contract: Contract,
    evmAddress: string,
    aptosEid: eid
): Promise<RecvLibraryTimeoutConfig> {
    const recvLibTimeoutParam: RecvLibraryTimeoutConfig = await epv2Contract.receiveLibraryTimeout(evmAddress, aptosEid)

    const recvLib = recvLibTimeoutParam.lib

    if (recvLib === constants.AddressZero) {
        return {
            lib: constants.AddressZero,
            expiry: BigInt(0),
        }
    }

    return recvLibTimeoutParam
}
