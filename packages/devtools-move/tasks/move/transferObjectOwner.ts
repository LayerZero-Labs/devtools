import { OFT } from '../../sdk/oft'

import { parseYaml } from './utils/aptosNetworkParser'
import { createTransferObjectOwnerPayload } from './utils/moveVMOftConfigOps'
import { getContractNameFromLzConfig, getMoveVMOAppAddress, sendAllTxs } from './utils/utils'
import { getChain } from '../../sdk/moveVMConnectionBuilder'
import { getConnection } from '../../sdk/moveVMConnectionBuilder'
import { getLzConfig, getMoveVMContracts, promptUserContractSelection } from './utils/config'
import { getNetworkForChainId } from '@layerzerolabs/lz-definitions'

async function transferObjectOwner(newOwner: string, configPath: string) {
    const { account_address, private_key, network, fullnode } = await parseYaml()

    const lzConfig = await getLzConfig(configPath)
    const chain = getChain(fullnode)
    const aptos = getConnection(chain, network)

    const moveVMContracts = getMoveVMContracts(lzConfig)
    const selectedContract = await promptUserContractSelection(moveVMContracts)
    const eid = selectedContract.contract.eid
    const lzNetworkStage = getNetworkForChainId(eid).env

    const contractName = getContractNameFromLzConfig(eid, lzConfig)
    const oAppAddress = getMoveVMOAppAddress(contractName, chain, lzNetworkStage)

    console.log(`\n👑 Transferring ${chain}-${lzNetworkStage} Object Ownership`)
    console.log(`\tFor Object at: ${oAppAddress}\n`)
    console.log(`\tNew Owner: ${newOwner}\n`)

    const oft = new OFT(aptos, oAppAddress, account_address, private_key, eid)

    const transferOwnerPayload = createTransferObjectOwnerPayload(oAppAddress, newOwner)

    const payloads = [transferOwnerPayload]

    await sendAllTxs(aptos, oft, account_address, payloads)
}

export { transferObjectOwner }
