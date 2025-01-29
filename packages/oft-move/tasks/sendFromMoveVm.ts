import { Aptos, AptosConfig } from '@aptos-labs/ts-sdk'

import { EndpointId } from '@layerzerolabs/lz-definitions'
import { Options } from '@layerzerolabs/lz-v2-utilities'

import { OFT } from '@layerzerolabs/devtools-move/sdk/oft'
import { hexAddrToAptosBytesAddr } from '@layerzerolabs/devtools-move/sdk/utils'

import { getLzNetworkStage, parseYaml } from '@layerzerolabs/devtools-move/tasks/move/utils/aptosNetworkParser'
import { getMoveVMOftAddress, sendAllTxs } from '@layerzerolabs/devtools-move/tasks/move/utils/utils'
import { toAptosAddress } from '@layerzerolabs/devtools-move/tasks/move/utils/moveVMOftConfigOps'
import { getChain } from '@layerzerolabs/devtools-move/sdk/moveVMConnectionBuilder'

async function sendFromMoveVm(
    amountLd: bigint,
    minAmountLd: bigint,
    toAddress: string,
    gasLimit: bigint,
    dstEid: EndpointId,
    srcAddress: string
) {
    const { account_address, private_key, network, fullnode } = await parseYaml()
    console.log(`Using aptos network ${network}`)

    const aptosConfig = new AptosConfig({ network: network })
    const aptos = new Aptos(aptosConfig)

    const lzNetworkStage = getLzNetworkStage(network)
    const chain = getChain(fullnode)
    const aptosOftAddress = getMoveVMOftAddress(chain, lzNetworkStage)

    const oft = new OFT(aptos, aptosOftAddress, account_address, private_key)

    // Pad EVM address to 64 chars and convert Solana address to Aptos address
    toAddress = toAptosAddress(toAddress, dstEid.toString())
    const toAddressBytes = hexAddrToAptosBytesAddr(toAddress)
    const options = Options.newOptions().addExecutorLzReceiveOption(BigInt(gasLimit))

    console.log(`Sending ${amountLd} units`)
    console.log(`\tUsing OFT at address: ${aptosOftAddress}`)
    console.log(`\tFrom account: ${srcAddress}`)
    console.log(`\tTo account: ${toAddress}`)
    console.log(`\tdstEid: ${dstEid}`)
    console.log(`\tsrcAddress: ${srcAddress}`)

    const extra_options = options.toBytes()
    const compose_message = new Uint8Array([])
    const oft_cmd = new Uint8Array([])

    const [nativeFee, zroFee] = await oft.quoteSend(
        srcAddress,
        dstEid,
        toAddressBytes,
        amountLd,
        minAmountLd,
        extra_options,
        compose_message,
        oft_cmd,
        false
    )

    console.log('\nQuote received:')
    console.log('- Native fee:', nativeFee)
    console.log('- ZRO fee:', zroFee)

    const sendPayload = oft.sendPayload(
        dstEid,
        toAddressBytes,
        amountLd,
        minAmountLd,
        extra_options,
        compose_message,
        oft_cmd,
        nativeFee,
        0
    )

    const payloads = [{ payload: sendPayload, description: 'Send Aptos OFT', eid: dstEid }]
    await sendAllTxs(aptos, oft, srcAddress, payloads)

    // Check the balance again
    const balance = await aptos.view({
        payload: {
            function: `${aptosOftAddress}::oft::balance`,
            functionArguments: [srcAddress],
        },
    })
    console.log('New balance:', balance)
}

export { sendFromMoveVm }
