import { task } from 'hardhat/config'

import { initializeTaskContext } from '@layerzerolabs/devtools-move/sdk/baseTaskHelper'
import { transferObjectOwner } from '@layerzerolabs/devtools-move/tasks/move/transferObjectOwner'

task('lz:oft:aptos:transfer-object-owner', 'Transfer object owner')
    .addParam('oappConfig', 'Path to layerzero config')
    .addParam('newOwner', 'New owner address')
    .setAction(async ({ oappConfig, newOwner }) => {
        const ctx = await initializeTaskContext(oappConfig)
        await transferObjectOwner(ctx, newOwner)
    })
