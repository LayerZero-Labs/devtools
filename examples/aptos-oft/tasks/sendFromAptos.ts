import { Aptos, AptosConfig } from '@aptos-labs/ts-sdk'
import { OFT } from '../sdk/oft'
import { getAptosOftAddress, networkToIndexerMapping } from './utils/utils'
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

    // Get the metadata first
    const metadata = await aptos.view({
        payload: {
            function: `${aptosOftAddress}::oft::metadata`,
            functionArguments: [],
        },
    })
    console.log('Metadata:')
    console.dir(metadata, { depth: null })
    let primaryBalance
    // Check primary store balance using the correct function
    try {
        primaryBalance = await aptos.view({
            payload: {
                function: `${aptosOftAddress}::oft::balance`, // Use the OFT's own balance function
                functionArguments: [account_address],
            },
        })
        console.log('OFT balance:', primaryBalance)
    } catch (e) {
        console.log('Failed to get OFT balance:', e)
    }

    // If balance is 0 or undefined, we need to mint first
    if (!primaryBalance || primaryBalance[0] === 0) {
        console.log('No balance found. Make sure you have minted tokens first.')
        return
    }

    // Try an extremely small amount first
    const amount_ld = 1 // Just try 1 unit
    const min_amount_ld = 1

    console.log(`Attempting to send ${amount_ld} units`)
    console.log(`Using OFT address: ${aptosOftAddress}`)
    console.log(`From account: ${account_address}`)

    const dst_eid = EndpointId.BSC_V2_SANDBOX
    const to = hexAddrToAptosBytesAddr('0x0000000000000000000000003e96158286f348145819244000776202ae5e0283')
    const extra_options = new Uint8Array([])
    const compose_message = new Uint8Array([])
    const oft_cmd = new Uint8Array([])

    const [nativeFee, zroFee] = await oft.quoteSend(
        account_address,
        dst_eid,
        to,
        amount_ld,
        min_amount_ld,
        extra_options,
        compose_message,
        oft_cmd,
        false // pay_in_zro: false to pay in native tokens
    )

    // console.log('Quote received:')
    // console.log('- Native fee:', nativeFee)
    // console.log('- ZRO fee:', zroFee)

    // const sendPayload = oft.sendPayload(
    //     dst_eid,
    //     to,
    //     amount_ld,
    //     min_amount_ld,
    //     extra_options,
    //     compose_message,
    //     oft_cmd,
    //     nativeFee,
    //     zroFee
    // )

    // await sendAllTxs(aptos, oft, account_address, [sendPayload])

    // // Check the balance again
    // const balance = await aptos.view({
    //     payload: {
    //         function: `${aptosOftAddress}::oft::balance`,
    //         functionArguments: [account_address],
    //     },
    // })
    // console.log('New balance:', balance)
}

main().catch((error) => {
    console.error('Error:', error)
    process.exit(1)
})
