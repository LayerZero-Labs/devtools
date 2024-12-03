import { Aptos, AptosConfig, InputGenerateTransactionPayloadData } from '@aptos-labs/ts-sdk'
import { OFT } from '../sdk/oft'
import {
    getAptosOftAddress,
    getDelegateFromLzConfig,
    getOwnerFromLzConfig,
    networkToIndexerMapping,
    sendAllTxs,
} from './utils/utils'
import { getEidFromAptosNetwork, getLzNetworkStage, parseYaml } from './utils/aptosNetworkParser'
import { setDelegate, transferOwner } from './utils/aptosOftConfigOps'

async function main() {
    const { account_address, private_key, network, fullnode, faucet } = await parseYaml()

    const aptosConfig = new AptosConfig({
        network: network,
        fullnode: fullnode,
        indexer: networkToIndexerMapping[network],
        faucet: faucet,
    })
    const aptos = new Aptos(aptosConfig)

    const lzNetworkStage = getLzNetworkStage(network)
    const aptosOftAddress = getAptosOftAddress(lzNetworkStage)

    console.log(`\n↗️ Transferring Ownership & Setting Aptos OFT Delegate...`)

    const oft = new OFT(aptos, aptosOftAddress, account_address, private_key)

    const eid = getEidFromAptosNetwork(network)
    const delegate = getDelegateFromLzConfig(eid)
    const owner = getOwnerFromLzConfig(eid)

    const setDelegatePayload = await setDelegate(oft, delegate)
    const transferOwnerPayload = await transferOwner(oft, owner)

    sendAllTxs(aptos, oft, account_address, [
        setDelegatePayload as InputGenerateTransactionPayloadData,
        transferOwnerPayload as InputGenerateTransactionPayloadData,
    ])
}

main().catch((error) => {
    console.error('Error:', error)
    process.exit(1)
})
