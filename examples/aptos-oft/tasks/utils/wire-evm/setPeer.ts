import { AptosOFTMetadata, EidMetadataMapping, EidTxMap } from '../types'
import { diffPrinter } from '../utils'
import { Contract } from 'ethers'
/**
 * Sets peer information for connections to wire.
 */
export async function createSetPeerTransactions(
    eidDataMapping: EidMetadataMapping,
    aptosOft: AptosOFTMetadata
): Promise<EidTxMap> {
    const TxTypePool: EidTxMap = {}

    for (const [eid, eidData] of Object.entries(eidDataMapping)) {
        const contract = eidData.contract
        const evmAddress = eidData.evmAddress

        const aptosEid = aptosOft.eid
        const aptosAddress = aptosOft.aptosAddress

        const peer = await getPeer(contract, aptosEid)

        if (peer === aptosAddress) {
            console.log(`\x1b[43m Skipping: Peer already set for ${eid} @ ${evmAddress} \x1b[0m`)
            continue
        }

        diffPrinter(`Setting Peer on ${eid}`, { peer }, { peer: aptosAddress })

        const tx = await contract.populateTransaction.setPeer(aptosEid, aptosAddress)

        if (!TxTypePool[eid]) {
            TxTypePool[eid] = []
        }

        TxTypePool[eid].push(tx)
    }

    return TxTypePool
}

export async function getPeer(contract: Contract, eid: number) {
    return await contract.peers(eid)
}
