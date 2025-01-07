import { Aptos, AptosConfig } from '@aptos-labs/ts-sdk'

import { OFT } from '../../sdk/oft'

import { getEidFromAptosNetwork, getLzNetworkStage, parseYaml } from './utils/aptosNetworkParser'
import { setDelegate, transferOwner } from './utils/moveVMOftConfigOps'
import { getDelegateFromLzConfig, getMoveVMOftAddress, getOwnerFromLzConfig, sendAllTxs } from './utils/utils'
import path from 'path'

async function transferOwnership(args: any) {
    const { account_address, private_key, network } = await parseYaml()

    const aptosConfig = new AptosConfig({ network: network })
    const configPath = args.lz_config

    const aptos = new Aptos(aptosConfig)

    const lzConfigPath = path.resolve(path.join(process.cwd(), configPath))
    const lzConfigFile = await import(lzConfigPath)
    const lzConfig = lzConfigFile.default

    const lzNetworkStage = getLzNetworkStage(network)
    const aptosOftAddress = getMoveVMOftAddress(lzNetworkStage)

    console.log(`\n↗️ Transferring Ownership & Setting Aptos OFT Delegate...`)

    const oft = new OFT(aptos, aptosOftAddress, account_address, private_key)

    const eid = getEidFromAptosNetwork('aptos', network)
    const delegate = getDelegateFromLzConfig(eid, lzConfig)
    const owner = getOwnerFromLzConfig(eid, lzConfig)

    const setDelegatePayload = await setDelegate(oft, delegate, eid)
    const transferOwnerPayload = await transferOwner(oft, owner, eid)

    const payloads = [setDelegatePayload, transferOwnerPayload]

    sendAllTxs(aptos, oft, account_address, payloads)
}

export { transferOwnership }
