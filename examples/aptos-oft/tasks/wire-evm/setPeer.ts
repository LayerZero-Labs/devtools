import { AptosOFTMetadata, ContractMetadataMapping, EidTxMap } from '../utils/types'
import { diffPrinter } from '../utils/utils'
import { Contract } from 'ethers'

/**
 * Sets peer information for connections to wire.
 */
export async function createSetPeerTransactions(
    eidDataMapping: ContractMetadataMapping,
    aptosOft: AptosOFTMetadata
): Promise<EidTxMap> {
    const txTypePool: EidTxMap = {}

    for (const [eid, { contract, evmAddress }] of Object.entries(eidDataMapping)) {
        const { eid: aptosEid, aptosAddress } = aptosOft

        const currentPeer = await getPeer(contract, aptosEid)

        if (currentPeer === aptosAddress) {
            console.log(`\x1b[43m Skipping: Peer already set for ${eid} @ ${evmAddress} \x1b[0m`)
            continue
        }

        diffPrinter(`Setting Peer on ${eid}`, { peer: currentPeer }, { peer: aptosAddress })

        const tx = await contract.populateTransaction.setPeer(aptosEid, aptosAddress)

        if (!txTypePool[eid]) {
            txTypePool[eid] = []
        }

        txTypePool[eid].push(tx)
    }

    return txTypePool
}

export async function getPeer(contract: Contract, eid: number) {
    return await contract.peers(eid)
}
