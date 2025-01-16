import { OFT } from '../../sdk/oft'

import { getLzNetworkStage, parseYaml } from './utils/aptosNetworkParser'
import { createTransferObjectOwnerPayload } from './utils/moveVMOftConfigOps'
import { getMoveVMOftAddress, sendAllTxs } from './utils/utils'
import { getChain } from '../../sdk/moveVMConnectionBuilder'
import { getConnection } from '../../sdk/moveVMConnectionBuilder'

async function transferObjectOwner(newOwner: string) {
    const { account_address, private_key, network, fullnode, faucet } = await parseYaml()

    const chain = getChain(fullnode)
    const aptos = getConnection(chain, network, fullnode, faucet)

    const lzNetworkStage = getLzNetworkStage(network)
    const oftAddress = getMoveVMOftAddress(network, lzNetworkStage)
    console.log(`\n👑 Transferring ${chain}-${lzNetworkStage} Object Ownership`)
    console.log(`\tFor Object at: ${oftAddress}\n`)
    console.log(`\tNew Owner: ${newOwner}\n`)

    const oft = new OFT(aptos, oftAddress, account_address, private_key)

    const transferOwnerPayload = createTransferObjectOwnerPayload(oftAddress, newOwner)

    const payloads = [transferOwnerPayload]

    sendAllTxs(aptos, oft, account_address, payloads)
}

export { transferObjectOwner }
