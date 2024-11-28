import { WireEvm, AptosOFTMetadata } from '../types'

/**
 * Sets peer information for connections to wire.
 */
export async function setPeerX(wireFactories: WireEvm[], aptosOft: AptosOFTMetadata) {
    for (const wireFactory of wireFactories) {
        const contract = wireFactory.contract

        const peer = await contract.peers(aptosOft.eid)
        const address = wireFactory.evmAddress
        const eid = wireFactory.fromEid

        if (peer == aptosOft.aptosAddress) {
            const msg = `Peer already set for ${eid} @ ${address}`
            console.log(`\x1b[43m Skipping: ${msg} \x1b[0m`)
            continue
        }
        await contract.setPeer(aptosOft.eid, aptosOft.aptosAddress)
        const msg = `Peer set successfully for ${eid} @ ${address}`
        console.log(`\x1b[42m Success: ${msg} \x1b[0m`)
    }
}
