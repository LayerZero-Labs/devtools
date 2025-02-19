import { EndpointId, getNetworkForChainId } from '@layerzerolabs/lz-definitions'
import { Options } from '@layerzerolabs/lz-v2-utilities'
import * as readline from 'readline'

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

    try {
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
    } catch (error) {
        const errorString = (error instanceof Error ? error.message : String(error)).toLowerCase()

        if (errorString.includes('arithmetic_error')) {
            console.error(
                '\n\n\x1b[31m❌ Arithmetic Error Received. Most likely the OFT has not been initialized.\x1b[0m'
            )
            console.log(
                '\n💡 Please set your configuration values in deploy-move/OFTInitParams.ts and then run the following command:'
            )
            console.log(
                'pnpm run lz:sdk:move:init-fa --oapp-config move.layerzero.config.ts --move-deploy-script deploy-move/OFTInitParams.ts'
            )
        } else if (errorString.includes('invalid_input')) {
            const srcNetwork = getNetworkForChainId(taskContext.srcEid)
            const dstNetwork = getNetworkForChainId(dstEid)
            console.error(
                `\n\n\x1b[31m❌ Invalid Input Error Received. Most likely the OFT has not been wired between ${srcNetwork.chainName}-${srcNetwork.env} and ${dstNetwork.chainName}-${dstNetwork.env}.\x1b[0m`
            )
            console.log('\n💡 Try running the following commands:')
            console.log('pnpm run lz:sdk:move:wire --oapp-config move.layerzero.config.ts')
            console.log('pnpm run lz:sdk:evm:wire --oapp-config move.layerzero.config.ts')
        }

        console.log('\nWould you like to see the full error? (y/n)')
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        })

        await new Promise<void>((resolve) => {
            rl.question('', (answer) => {
                if (answer.toLowerCase() === 'y') {
                    console.log('\nFull error:', error)
                }
                rl.close()
                resolve()
            })
        })
    }
}

export { sendFromMoveVm }
