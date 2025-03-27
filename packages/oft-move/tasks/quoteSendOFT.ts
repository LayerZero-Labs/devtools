import { Options } from '@layerzerolabs/lz-v2-utilities'
import { EndpointId } from '@layerzerolabs/lz-definitions'

import { hexAddrToAptosBytesAddr, evmAddressToAptos, TaskContext } from '@layerzerolabs/devtools-move'

async function quoteSendOFT(
    taskContext: TaskContext,
    amountLd: number,
    minAmountLd: number,
    toAddress: string,
    gasLimit: number,
    dstEid: EndpointId,
    srcAddress: string
) {
    // Pad EVM address to 64 chars and convert Solana address to Aptos address
    toAddress = evmAddressToAptos(toAddress, dstEid.toString())
    const toAddressBytes = hexAddrToAptosBytesAddr(toAddress)
    const options = Options.newOptions().addExecutorLzReceiveOption(BigInt(gasLimit))

    console.log(`Attempting to quote send ${amountLd} units`)
    console.log(`Using OFT at address: ${taskContext.oAppAddress}`)
    console.log(`From account: ${srcAddress}`)
    console.log(`To account: ${toAddress}`)
    console.log(`dstEid: ${dstEid}`)

    const extra_options = options.toBytes()
    const compose_message = new Uint8Array([])
    const oft_cmd = new Uint8Array([])

    const [nativeFee, zroFee] = await taskContext.oft.quoteSend(
        srcAddress,
        dstEid,
        toAddressBytes,
        amountLd,
        minAmountLd,
        extra_options,
        compose_message,
        oft_cmd,
        false // pay_in_zro: false to pay in native tokens
    )

    console.log('\nQuote received:')
    console.log('- Native fee:', nativeFee)
    console.log('- ZRO fee:', zroFee)
    console.log('If the above fees are acceptable, the wiring is confirmed to be successful.')
}

export { quoteSendOFT }
