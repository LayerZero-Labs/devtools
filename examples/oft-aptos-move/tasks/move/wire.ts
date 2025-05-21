import { task } from 'hardhat/config'

import { initializeTaskContext } from '@layerzerolabs/devtools-move/sdk/baseTaskHelper'
import { wireMove } from '@layerzerolabs/devtools-move/tasks/move/wireMove'

task('lz:oft:aptos:wire', 'Wire Move contracts')
    .addParam('oappConfig', 'Path to layerzero config')
    .setAction(async ({ oappConfig }) => {
        const ctx = await initializeTaskContext(oappConfig)
        await wireMove(ctx)
    })
