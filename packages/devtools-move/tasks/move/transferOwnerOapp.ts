import { OFT } from '../../sdk/oft'

import { parseYaml } from './utils/aptosNetworkParser'
import { createTransferOwnerOAppPayload } from './utils/moveVMOftConfigOps'
import { getContractNameFromLzConfig, getMoveVMOAppAddress, sendAllTxs } from './utils/utils'
import { getChain } from '../../sdk/moveVMConnectionBuilder'
import { getConnection } from '../../sdk/moveVMConnectionBuilder'
import { getLzConfig, getMoveVMContracts, promptUserContractSelection } from './utils/config'
import { Aptos } from '@aptos-labs/ts-sdk'
import { getNetworkForChainId } from '@layerzerolabs/lz-definitions'

async function transferOAppOwner(newOwner: string, configPath: string) {
    const { account_address, private_key, network, fullnode } = await parseYaml()

    const chain = getChain(fullnode)
    const aptos = getConnection(chain, network)

    const lzConfig = await getLzConfig(configPath)
    const moveVMContracts = getMoveVMContracts(lzConfig)
    const selectedContract = await promptUserContractSelection(moveVMContracts)
    const eid = selectedContract.contract.eid
    const lzNetworkStage = getNetworkForChainId(eid).env

    const contractName = getContractNameFromLzConfig(eid, lzConfig)
    const oAppAddress = getMoveVMOAppAddress(contractName, chain, lzNetworkStage)

    console.log(`\n👑 Transferring ${chain}-${lzNetworkStage} OApp Ownership`)
    console.log(`\tFor OApp at: ${oAppAddress}\n`)
    console.log(`\tNew Owner: ${newOwner}\n`)

    const oft = new OFT(aptos as Aptos, oAppAddress, account_address, private_key, eid)

    const transferOwnerPayload = await createTransferOwnerOAppPayload(oft, newOwner, eid)

    const payloads = [transferOwnerPayload]

    await sendAllTxs(aptos as Aptos, oft, account_address, payloads)
}

export { transferOAppOwner }
