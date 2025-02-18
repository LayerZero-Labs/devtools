import { EndpointId } from '@layerzerolabs/lz-definitions'
import { Options } from '@layerzerolabs/lz-v2-utilities'

import { hexAddrToAptosBytesAddr } from '@layerzerolabs/devtools-move/sdk/utils'
import { sendAllTxs } from '@layerzerolabs/devtools-move/tasks/move/utils/utils'
import { evmAddressToAptos } from '@layerzerolabs/devtools-move/tasks/move/utils/moveVMOftConfigOps'
import { TaskContext } from '@layerzerolabs/devtools-move/sdk/baseTaskHelper'
async function sendFromMoveVm(
    taskContext: TaskContext,
    amountLd: bigint,
    minAmountLd: bigint,
    toAddress: string,
    gasLimit: bigint,
    dstEid: EndpointId,
    srcAddress: string
) {
    // Pad EVM address to 64 chars and convert Solana address to Aptos address
    toAddress = evmAddressToAptos(toAddress, dstEid.toString())
    const toAddressBytes = hexAddrToAptosBytesAddr(toAddress)
    const options = Options.newOptions().addExecutorLzReceiveOption(BigInt(gasLimit))

    console.log(`🚀 Sending ${amountLd} units`)
    console.log(`📜 Using OFT at address: ${taskContext.oAppAddress}`)
    console.log(`👤 From account: ${taskContext.accountAddress}`)
    console.log(`📫 To account: ${toAddress}`)
    console.log(`🌐 dstEid: ${dstEid}`)
    console.log(`📍 srcAddress: ${srcAddress}`)
    console.log(`🔍 Min amount: ${minAmountLd}`)

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
        false
    )

    console.log('\n💰 Quote received:')
    console.log('💸 Native fee:', nativeFee)
    console.log('🪙 ZRO fee:', zroFee)

    const sendPayload = taskContext.oft.sendPayload(
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
    await sendAllTxs(taskContext.moveVMConnection, taskContext.oft, srcAddress, payloads)
}

export { sendFromMoveVm }
