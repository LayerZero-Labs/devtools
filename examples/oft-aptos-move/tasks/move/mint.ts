import { task } from 'hardhat/config'

import { initializeTaskContext } from '@layerzerolabs/devtools-move/sdk/baseTaskHelper'
import mintToMoveVM from '@layerzerolabs/oft-move/tasks/mintToMoveVM'

task('lz:sdk:move:mint-to-move-oft', 'Mint tokens on Move OFT')
    .addParam('oappConfig', 'Path to layerzero config')
    .addParam('amountLd', 'Amount in local decimals')
    .addParam('toAddress', 'Recipient address')
    .setAction(async ({ oappConfig, amountLd, toAddress }) => {
        const ctx = await initializeTaskContext(oappConfig)
        await mintToMoveVM(ctx, BigInt(amountLd), toAddress)
    })
