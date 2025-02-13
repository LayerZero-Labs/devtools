import { OFT } from '../../sdk/oft'

import { getEidFromMoveNetwork, getLzNetworkStage, parseYaml } from './utils/aptosNetworkParser'
import { createTransferOwnerOAppPayload } from './utils/moveVMOftConfigOps'
import { getContractNameFromLzConfig, getMoveVMOAppAddress, sendAllTxs } from './utils/utils'
import { getChain } from '../../sdk/moveVMConnectionBuilder'
import { getConnection } from '../../sdk/moveVMConnectionBuilder'
import { getLzConfig } from './utils/config'

async function transferOAppOwner(newOwner: string, configPath: string) {
    const { account_address, private_key, network, fullnode, faucet } = await parseYaml()

    const chain = getChain(fullnode)
    const aptos = getConnection(chain, network, fullnode, faucet)

    const lzConfig = await getLzConfig(configPath)
    const lzNetworkStage = getLzNetworkStage(network)
    const eid = getEidFromMoveNetwork(chain, network)

    const contractName = getContractNameFromLzConfig(eid, lzConfig)
    const oAppAddress = getMoveVMOAppAddress(contractName, chain, lzNetworkStage)

    console.log(`\n👑 Transferring ${chain}-${lzNetworkStage} OApp Ownership`)
    console.log(`\tFor OApp at: ${oAppAddress}\n`)
    console.log(`\tNew Owner: ${newOwner}\n`)

    const oft = new OFT(aptos, oAppAddress, account_address, private_key, eid)

    const transferOwnerPayload = await createTransferOwnerOAppPayload(oft, newOwner, eid)

    const payloads = [transferOwnerPayload]

    sendAllTxs(aptos, oft, account_address, payloads)
}

export { transferOAppOwner }
