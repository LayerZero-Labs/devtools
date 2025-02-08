import { Aptos, AptosConfig } from '@aptos-labs/ts-sdk'
import { getChain, getConnection } from '@layerzerolabs/devtools-move/sdk/moveVMConnectionBuilder'
import { OFT } from '@layerzerolabs/devtools-move/sdk/oft'

import { parseYaml } from '@layerzerolabs/devtools-move/tasks/move/utils/aptosNetworkParser'
import {
    getLzConfig,
    getMoveVMContracts,
    promptUserContractSelection,
} from '@layerzerolabs/devtools-move/tasks/move/utils/config'
import { TransactionPayload } from '@layerzerolabs/devtools-move/tasks/move/utils/moveVMOftConfigOps'
import {
    getContractNameFromLzConfig,
    getMoveVMOAppAddress,
    sendAllTxs,
} from '@layerzerolabs/devtools-move/tasks/move/utils/utils'
import { getNetworkForChainId } from '@layerzerolabs/lz-definitions'

async function mintToMoveVM(configPath: string, amountLd: number, toAddress: string) {
    const { account_address, private_key, network, fullnode } = await parseYaml()
    console.log(`Using aptos network ${network}`)

    const chain = getChain(fullnode)
    const moveVMConnection = getConnection(chain, network)

    const lzConfig = await getLzConfig(configPath)
    const moveVMContracts = getMoveVMContracts(lzConfig)
    const selectedContract = await promptUserContractSelection(moveVMContracts)
    const eid = selectedContract.contract.eid
    const lzNetworkStage = getNetworkForChainId(eid).env
    const contractName = getContractNameFromLzConfig(eid, lzConfig)
    const aptosOftAddress = getMoveVMOAppAddress(contractName, chain, lzNetworkStage)

    console.log(`\n🪙  Minting ${chain}-${lzNetworkStage} OFT ✨`)
    console.log(`\tAddress: ${aptosOftAddress}`)
    console.log(`\tAmount: ${amountLd}`)
    console.log(`\tTo: ${toAddress}`)

    const oft = new OFT(moveVMConnection, aptosOftAddress, account_address, private_key, eid)
    const mintPayload = oft.mintPayload(toAddress, amountLd)

    const transactionPayload: TransactionPayload = {
        payload: mintPayload,
        description: `Mint ${chain}-${lzNetworkStage} OFT`,
        eid: eid,
    }
    await sendAllTxs(moveVMConnection, oft, account_address, [transactionPayload])
}

export default mintToMoveVM
