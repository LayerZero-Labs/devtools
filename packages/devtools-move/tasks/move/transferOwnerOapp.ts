import { OFT } from '../../sdk/oft'

import { getEidFromMoveNetwork, getLzNetworkStage, parseYaml } from './utils/aptosNetworkParser'
import { createTransferOwnerOAppPayload } from './utils/moveVMOftConfigOps'
import { getMoveVMOftAddress, sendAllTxs } from './utils/utils'
import { getChain } from '../../sdk/moveVMConnectionBuilder'
import { getConnection } from '../../sdk/moveVMConnectionBuilder'

async function transferOAppOwner(newOwner: string) {
    const { account_address, private_key, network, fullnode, faucet } = await parseYaml()

    const chain = getChain(fullnode)
    const aptos = getConnection(chain, network, fullnode, faucet)

    const lzNetworkStage = getLzNetworkStage(network)
    const oftAddress = getMoveVMOftAddress(network, lzNetworkStage)
    console.log(`\n👑 Transferring ${chain}-${lzNetworkStage} OApp Ownership`)
    console.log(`\tFor OApp at: ${oftAddress}\n`)
    console.log(`\tNew Owner: ${newOwner}\n`)

    const oft = new OFT(aptos, oftAddress, account_address, private_key)

    const eid = getEidFromMoveNetwork(chain, network)

    const transferOwnerPayload = await createTransferOwnerOAppPayload(oft, newOwner, eid)

    const payloads = [transferOwnerPayload]

    sendAllTxs(aptos, oft, account_address, payloads)
}

export { transferOAppOwner }
