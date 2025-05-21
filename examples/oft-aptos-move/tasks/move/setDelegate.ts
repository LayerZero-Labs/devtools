import { task } from 'hardhat/config'

import { initializeTaskContext } from '@layerzerolabs/devtools-move/sdk/baseTaskHelper'
import { setDelegate } from '@layerzerolabs/devtools-move/tasks/move/setDelegate'

task('lz:oft:aptos:set-delegate', 'Set Move delegate')
    .addParam('oappConfig', 'Path to layerzero config')
    .setAction(async ({ oappConfig }) => {
        const ctx = await initializeTaskContext(oappConfig)
        await setDelegate(ctx)
    })
