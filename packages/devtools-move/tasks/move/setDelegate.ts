import path from 'path'
import { getChain, getConnection } from '../../sdk/moveVMConnectionBuilder'
import { OFT } from '../../sdk/oft'

import { getEidFromMoveNetwork, getLzNetworkStage, parseYaml } from './utils/aptosNetworkParser'
import { setDelegate } from './utils/moveVMOftConfigOps'
import { getDelegateFromLzConfig, getMoveVMOftAddress, sendAllTxs } from './utils/utils'

async function executeSetDelegate(args: any, useAccountAddress: boolean = false) {
    const configPath = args.oapp_config
    const lzConfigPath = path.resolve(path.join(process.cwd(), configPath))
    const lzConfigFile = await import(lzConfigPath)
    const lzConfig = lzConfigFile.default

    const { account_address, private_key, network, fullnode, faucet } = await parseYaml()

    const chain = getChain(fullnode)
    const aptos = getConnection(chain, network, fullnode, faucet)

    const lzNetworkStage = getLzNetworkStage(network)
    const oftAddress = getMoveVMOftAddress(lzNetworkStage)

    console.log(`\n🔧 Setting ${chain}-${lzNetworkStage} OFT Delegate`)
    console.log(`\tFor: ${oftAddress}\n`)

    const oft = new OFT(aptos, oftAddress, account_address, private_key)

    const eid = getEidFromMoveNetwork(chain, network)
    const delegate = useAccountAddress ? account_address : getDelegateFromLzConfig(eid, lzConfig)

    const setDelegatePayload = await setDelegate(oft, delegate, eid)

    sendAllTxs(aptos, oft, account_address, [setDelegatePayload])
}

export { executeSetDelegate as setDelegate }
