import { Aptos, AptosConfig } from '@aptos-labs/ts-sdk'
import { getChain } from '@layerzerolabs/devtools-move/sdk/moveVMConnectionBuilder'
import { OFT } from '@layerzerolabs/devtools-move/sdk/oft'

import {
    getEidFromMoveNetwork,
    getLzNetworkStage,
    parseYaml,
} from '@layerzerolabs/devtools-move/tasks/move/utils/aptosNetworkParser'
import { TransactionPayload } from '@layerzerolabs/devtools-move/tasks/move/utils/moveVMOftConfigOps'
import { getMoveVMOftAddress, sendAllTxs } from '@layerzerolabs/devtools-move/tasks/move/utils/utils'

async function mintToMoveVM(amountLd: number, toAddress: string) {
    const { account_address, private_key, network, fullnode } = await parseYaml()
    console.log(`Using aptos network ${network}`)

    const chain = getChain(fullnode)
    const aptosConfig = new AptosConfig({ network: network })
    const aptos = new Aptos(aptosConfig)

    const lzNetworkStage = getLzNetworkStage(network)
    const aptosOftAddress = getMoveVMOftAddress(chain, lzNetworkStage)

    console.log(`\n🪙  Minting ${chain}-${lzNetworkStage} OFT ✨`)
    console.log(`\tAddress: ${aptosOftAddress}`)
    console.log(`\tAmount: ${amountLd}`)
    console.log(`\tTo: ${toAddress}`)

    const oft = new OFT(aptos, aptosOftAddress, account_address, private_key)
    const mintPayload = oft.mintPayload(toAddress, amountLd)
    const eid = getEidFromMoveNetwork(chain, network)

    const transactionPayload: TransactionPayload = {
        payload: mintPayload,
        description: `Mint ${chain}-${lzNetworkStage} OFT`,
        eid: eid,
    }
    sendAllTxs(aptos, oft, account_address, [transactionPayload])
}

export default mintToMoveVM
