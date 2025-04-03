import { Contract } from 'ethers'

import { diffPrinter } from '../../shared/utils'

import { createDiffMessage, printAlreadySet, logPathwayHeader } from '../../shared/messageBuilder'
import type { EidTxMap, OmniContractMetadataMapping } from '../utils/types'

/**
 * @notice Sets peer information for connections to wire.
 * @dev Fetches the current peer from OApp
 * @dev Sets the new peer on the OApp
 * @returns EidTxMap
 */
export async function createSetPeerTransactions(eidDataMappings: OmniContractMetadataMapping): Promise<EidTxMap> {
    const txTypePool: EidTxMap = {}
    logPathwayHeader('setPeer')

    for (const [toEid, { peers, contract }] of Object.entries(eidDataMappings)) {
        for (const peer of peers) {
            const { eid: peerToEid, address: peerAddressBytes32 } = peer
            const currPeer = await getPeer(contract.oapp, peerToEid)

            if (currPeer.toLowerCase() === peerAddressBytes32.toLowerCase()) {
                printAlreadySet('peer', Number(toEid), Number(peerToEid))
                continue
            }

            const diffMessage = createDiffMessage('peer', Number(toEid), Number(peerToEid))
            diffPrinter(diffMessage, { 'base-32': currPeer }, { 'base-32': peerAddressBytes32 })

            const tx = await contract.oapp.populateTransaction.setPeer(peerToEid, peerAddressBytes32)

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
