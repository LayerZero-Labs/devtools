import { EndpointId } from '@layerzerolabs/lz-definitions'

import { getChain, getConnection } from '../../sdk/moveVMConnectionBuilder'
import { OFT } from '../../sdk/oft'

import { getLzNetworkStage, parseYaml } from './utils/aptosNetworkParser'
import { createSetFeeBpsTx } from './utils/moveVMOftConfigOps'
import { getMoveVMOftAddress, sendAllTxs } from './utils/utils'

async function main() {
    const { account_address, private_key, network, fullnode, faucet } = await parseYaml()

    const chain = getChain(fullnode)
    const aptos = getConnection(chain, network, fullnode, faucet)

    const lzNetworkStage = getLzNetworkStage(network)
    const oftAddress = getMoveVMOftAddress(lzNetworkStage)

    console.log(`\n🔧 Setting ${chain}-${lzNetworkStage} OFT Fee BPS`)
    console.log(`\tFor: ${oftAddress}\n`)
    const oft = new OFT(aptos, oftAddress, account_address, private_key)

    const feeBps = BigInt(10)
    const toEid = EndpointId.BSC_V2_TESTNET

    console.log(`\tFee BPS: ${feeBps}\n`)

    const setFeeBpsPayload = await createSetFeeBpsTx(oft, feeBps, toEid)

    sendAllTxs(aptos, oft, account_address, [setFeeBpsPayload])
}

main().catch((error) => {
    console.error('Error:', error)
    process.exit(1)
})
