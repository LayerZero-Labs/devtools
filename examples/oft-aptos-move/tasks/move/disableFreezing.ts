import { task } from 'hardhat/config'

import { initializeTaskContext } from '@layerzerolabs/devtools-move/sdk/baseTaskHelper'
import { permanentlyDisableFreezing } from '@layerzerolabs/oft-move/tasks/permanentlyDisableFreezing'

task('lz:sdk:move:permanently-disable-freezing', 'Disable freezing permanently')
    .addParam('oappConfig', 'Path to layerzero config')
    .setAction(async ({ oappConfig }) => {
        const ctx = await initializeTaskContext(oappConfig)
        await permanentlyDisableFreezing(ctx)
    })
