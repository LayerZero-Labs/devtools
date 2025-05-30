import { task } from 'hardhat/config'

import { initializeTaskContext } from '@layerzerolabs/devtools-move/sdk/baseTaskHelper'
import { sendFromMoveVm } from '@layerzerolabs/oft-move/tasks/sendFromMoveVm'

interface Params {
    oappConfig: string
    amountLd: string
    minAmountLd: string
    toAddress: string
    gasLimit: string
    dstEid: string
    srcAddress: string
}

task('lz:sdk:move:send-from-move-oft', 'Send from Move OFT')
    .addParam('oappConfig', 'Path to layerzero config')
    .addParam('amountLd', 'Amount')
    .addParam('minAmountLd', 'Min amount')
    .addParam('toAddress', 'Destination address')
    .addParam('gasLimit', 'Gas limit')
    .addParam('dstEid', 'Destination EID')
    .addParam('srcAddress', 'Source address')
    .setAction(async (args: Params) => {
        const ctx = await initializeTaskContext(args.oappConfig)
        await sendFromMoveVm(
            ctx,
            BigInt(args.amountLd),
            BigInt(args.minAmountLd),
            args.toAddress,
            BigInt(args.gasLimit),
            Number(args.dstEid) as any,
            args.srcAddress
        )
    })
