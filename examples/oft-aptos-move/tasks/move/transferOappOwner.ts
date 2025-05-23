import { task } from 'hardhat/config'

import { initializeTaskContext } from '@layerzerolabs/devtools-move/sdk/baseTaskHelper'
import { transferOAppOwner } from '@layerzerolabs/devtools-move/tasks/move/transferOwnerOapp'

task('lz:oft:aptos:transfer-oapp-owner', 'Transfer OApp owner')
    .addParam('oappConfig', 'Path to layerzero config')
    .addParam('newOwner', 'New owner address')
    .setAction(async ({ oappConfig, newOwner }) => {
        const ctx = await initializeTaskContext(oappConfig)
        await transferOAppOwner(ctx, newOwner)
    })
