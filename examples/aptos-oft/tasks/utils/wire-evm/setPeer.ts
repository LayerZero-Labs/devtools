import { WireEvm, AptosOFTMetadata } from '../types'
import { diffPrinter } from '../utils'
import { PopulatedTransaction } from 'ethers'
/**
 * Sets peer information for connections to wire.
 */
export async function createSetPeerTransactions(
    wireFactories: WireEvm[],
    aptosOft: AptosOFTMetadata
): Promise<PopulatedTransaction[]> {
    const setPeerTxPool = []

    for (const wireFactory of wireFactories) {
        const contract = wireFactory.contract
        const evmAddress = wireFactory.evmAddress
        const eid = wireFactory.fromEid

        const aptosEid = aptosOft.eid
        const aptosAddress = aptosOft.aptosAddress

        const peer = await getPeer(contract, aptosEid)

        if (peer === aptosAddress) {
            console.log(`\x1b[43m Skipping: Peer already set for ${eid} @ ${evmAddress} \x1b[0m`)
            setPeerTxPool.push({ data: '', from: '', to: '' })
            continue
        }

        diffPrinter(`Set Peer on ${eid}`, { peer }, { peer: aptosAddress })

        const tx = await contract.populateTransaction.setPeer(aptosEid, aptosAddress)

        setPeerTxPool.push(tx)
    }

    return setPeerTxPool
}

export async function getPeer(contract, eid: number) {
    return await contract.peers(eid)
}
