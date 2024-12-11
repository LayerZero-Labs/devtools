import { Aptos, AptosConfig } from '@aptos-labs/ts-sdk'

import { EndpointId } from '@layerzerolabs/lz-definitions-v3'
import { Options } from '@layerzerolabs/lz-v2-utilities-v3'

import { OFT } from '../../sdk/oft'
import { hexAddrToAptosBytesAddr } from '../../sdk/utils'

import { getLzNetworkStage, parseYaml } from './utils/aptosNetworkParser'
import { getAptosOftAddress, sendAllTxs } from './utils/utils'

async function main() {
    const { account_address, private_key, network } = await parseYaml()
    console.log(`Using aptos network ${network}`)

    const aptosConfig = new AptosConfig({ network: network })
    const aptos = new Aptos(aptosConfig)

    const lzNetworkStage = getLzNetworkStage(network)
    const aptosOftAddress = getAptosOftAddress(lzNetworkStage)

    const oft = new OFT(aptos, aptosOftAddress, account_address, private_key)

    const amount_ld = 200000
    const min_amount_ld = 1
    const toAddress = '0x462c2AE39B6B0bdB950Deb2BC82082308cF8cB10'
    const toAddressBytes = hexAddrToAptosBytesAddr(toAddress)
    const options = Options.newOptions().addExecutorLzReceiveOption(BigInt(200000))

    console.log(`Attempting to send ${amount_ld} units`)
    console.log(`Using OFT at address: ${aptosOftAddress}`)
    console.log(`From account: ${account_address}`)
    console.log(`To account: ${toAddress}`)

    const extra_options = options.toBytes()
    const compose_message = new Uint8Array([])
    const oft_cmd = new Uint8Array([])
    const dst_eid = EndpointId.BSC_V2_TESTNET

    const [nativeFee, zroFee] = await oft.quoteSend(
        account_address,
        dst_eid,
        toAddressBytes,
        amount_ld,
        min_amount_ld,
        extra_options,
        compose_message,
        oft_cmd,
        false // pay_in_zro: false to pay in native tokens
    )

    console.log('\nQuote received:')
    console.log('- Native fee:', nativeFee)
    console.log('- ZRO fee:', zroFee)

    const sendPayload = oft.sendPayload(
        dst_eid,
        toAddressBytes,
        amount_ld,
        min_amount_ld,
        extra_options,
        compose_message,
        oft_cmd,
        nativeFee,
        0
    )

    await sendAllTxs(aptos, oft, account_address, [sendPayload])

    // Check the balance again
    const balance = await aptos.view({
        payload: {
            function: `${aptosOftAddress}::oft::balance`,
            functionArguments: [account_address],
        },
    })
    console.log('New balance:', balance)
}

main().catch((error) => {
    console.error('Error:', error)
    process.exit(1)
})
