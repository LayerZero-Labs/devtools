import { Contract } from 'ethers'

import { diffPrinter } from '../../shared/utils'

import { createDiffMessage, printAlreadySet } from '../../shared/messageBuilder'
import type { ContractMetadataMapping, EidTxMap, NonEvmOAppMetadata } from '../utils/types'

/**
 * @notice Sets peer information for connections to wire.
 * @dev Fetches the current peer from OApp
 * @dev Sets the new peer on the OApp
 * @returns EidTxMap
 */
export async function createSetPeerTransactions(
    eidDataMapping: ContractMetadataMapping,
    nonEvmOapp: NonEvmOAppMetadata
): Promise<EidTxMap> {
    const txTypePool: EidTxMap = {}

    for (const [eid, { contract }] of Object.entries(eidDataMapping)) {
        const { eid: aptosEid, address: targetNonEvmAddress } = nonEvmOapp

        const currPeer = await getPeer(contract.oapp, aptosEid)

        if (currPeer === targetNonEvmAddress) {
            printAlreadySet('peer', Number(eid), Number(aptosEid))
            continue
        }

        const diffMessage = createDiffMessage('peer', Number(eid), Number(aptosEid))
        diffPrinter(diffMessage, { peer: currPeer }, { peer: targetNonEvmAddress })

        const tx = await contract.oapp.populateTransaction.setPeer(aptosEid, targetNonEvmAddress)

        txTypePool[eid] = txTypePool[eid] ?? []
        txTypePool[eid].push(tx)
    }

    return txTypePool
}

export async function getPeer(contract: Contract, eid: string) {
    return await contract.peers(eid)
}
