import { Aptos, AptosConfig } from '@aptos-labs/ts-sdk'
import { OFT } from '../sdk/oft'
import { getAptosOftAddress, networkToIndexerMapping, sendAllTxs } from './utils/utils'
import { getLzNetworkStage, parseYaml } from './utils/aptosNetworkParser'
import { EndpointId } from '@layerzerolabs/lz-definitions-v3'
import { hexAddrToAptosBytesAddr } from '../sdk/utils'

async function main() {
    const { account_address, private_key, network, fullnode, faucet } = await parseYaml()
    console.log(`Using aptos network ${network}`)

    const aptosConfig = new AptosConfig({
        network: network,
        fullnode: fullnode,
        indexer: networkToIndexerMapping[network],
        faucet: faucet,
    })
    const aptos = new Aptos(aptosConfig)

    const lzNetworkStage = getLzNetworkStage(network)
    const aptosOftAddress = getAptosOftAddress(lzNetworkStage)

    const oft = new OFT(aptos, aptosOftAddress, account_address, private_key)

    // Create payload parameters
    const dst_eid = EndpointId.BSC_SANDBOX
    const to = hexAddrToAptosBytesAddr('0x3e96158286f348145819244000776202Ae5E0283')
    const amount_ld = 1000
    const min_amount_ld = 1000
    const extra_options = new Uint8Array([])
    const compose_message = new Uint8Array([])
    const oft_cmd = new Uint8Array([])
    const native_fee = 0
    const zro_fee = 0

    const sendPayload = oft.sendPayload(
        dst_eid,
        to,
        amount_ld,
        min_amount_ld,
        extra_options,
        compose_message,
        oft_cmd,
        native_fee,
        zro_fee
    )

    sendAllTxs(aptos, oft, account_address, [sendPayload])
}

main().catch((error) => {
    console.error('Error:', error)
    process.exit(1)
})
