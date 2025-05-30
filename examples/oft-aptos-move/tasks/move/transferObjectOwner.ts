import { task } from 'hardhat/config'

import { initializeTaskContext } from '@layerzerolabs/devtools-move/sdk/baseTaskHelper'
import { transferObjectOwner } from '@layerzerolabs/devtools-move/tasks/move/transferObjectOwner'

task('lz:sdk:move:transfer-object-owner', 'Transfer object owner')
    .addParam('oappConfig', 'Path to layerzero config')
    .addParam('newOwner', 'New owner address')
    .setAction(async ({ oappConfig, newOwner }) => {
        const ctx = await initializeTaskContext(oappConfig)
        await transferObjectOwner(ctx, newOwner)
    })
