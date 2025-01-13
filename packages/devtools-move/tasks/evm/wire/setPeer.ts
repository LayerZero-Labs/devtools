import { Contract } from 'ethers'

import { diffPrinter } from '../../shared/utils'
import { basexToBytes32 } from '../../shared/basexToBytes32'
import { createDiffMessage, printAlreadySet } from '../../shared/messageBuilder'
import type { EidTxMap, OmniContractMetadataMapping } from '../utils/types'

/**
 * @notice Sets peer information for connections to wire.
 * @dev Fetches the current peer from OApp
 * @dev Sets the new peer on the OApp
 * @returns EidTxMap
 */
export async function createSetPeerTransactions(eidDataMappings: OmniContractMetadataMapping): Promise<EidTxMap> {
    const txTypePool: EidTxMap = {}

    for (const [toEid, { wireOntoOapps, contract }] of Object.entries(eidDataMappings)) {
        for (const wireOntoOapp of wireOntoOapps) {
            const { eid: peerToEid, address: targetNonEvmAddress } = wireOntoOapp
            const currPeer = await getPeer(contract.oapp, peerToEid)
            const targetEvmAddressAsBytes32 = basexToBytes32(targetNonEvmAddress, peerToEid)

            if (currPeer === targetEvmAddressAsBytes32) {
                printAlreadySet('peer', Number(toEid), Number(peerToEid))
                continue
            }

            const diffMessage = createDiffMessage('peer', Number(toEid), Number(peerToEid))
            diffPrinter(
                diffMessage,
                { 'base-native': currPeer, 'base-32': currPeer },
                { 'base-native': targetNonEvmAddress, 'base-32': targetEvmAddressAsBytes32 }
            )

            const tx = await contract.oapp.populateTransaction.setPeer(peerToEid, targetEvmAddressAsBytes32)

            txTypePool[toEid] = txTypePool[toEid] ?? []
            txTypePool[toEid].push({
                toEid: peerToEid,
                populatedTx: tx,
            })
        }
    }

    return txTypePool
}

export async function getPeer(contract: Contract, eid: string) {
    return await contract.peers(eid)
}
