import { getChain, getConnection } from '../../sdk/moveVMConnectionBuilder'
import { OFT } from '../../sdk/oft'

import { getEidFromMoveNetwork, getLzNetworkStage, parseYaml } from './utils/aptosNetworkParser'
import { setDelegate } from './utils/moveVMOftConfigOps'
import { getContractNameFromLzConfig, getDelegateFromLzConfig, getMoveVMOAppAddress, sendAllTxs } from './utils/utils'
import { getLzConfig } from './utils/config'

async function executeSetDelegate(args: any, useAccountAddress: boolean = false) {
    const configPath = args.oapp_config
    const { account_address, private_key, network, fullnode, faucet } = await parseYaml()

    const lzConfig = await getLzConfig(configPath)
    const chain = getChain(fullnode)
    const moveVMConnection = getConnection(chain, network, fullnode, faucet)

    const lzNetworkStage = getLzNetworkStage(network)
    const eid = getEidFromMoveNetwork(chain, network)
    const contractName = getContractNameFromLzConfig(eid, lzConfig)
    const oAppAddress = getMoveVMOAppAddress(contractName, chain, lzNetworkStage)

    console.log(`\n🔧 Setting ${chain}-${lzNetworkStage} OApp Delegate`)
    console.log(`\tFor: ${oAppAddress}\n`)

    const oft = new OFT(moveVMConnection, oAppAddress, account_address, private_key)

    const delegate = useAccountAddress ? account_address : getDelegateFromLzConfig(eid, lzConfig)

    const setDelegatePayload = await setDelegate(oft, delegate, eid)

    sendAllTxs(moveVMConnection, oft, account_address, [setDelegatePayload])
}

export { executeSetDelegate as setDelegate }
