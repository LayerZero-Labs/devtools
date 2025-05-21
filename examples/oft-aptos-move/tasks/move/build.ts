import { task } from 'hardhat/config'

import { initializeDeployTaskContext } from '@layerzerolabs/devtools-move/sdk/baseTaskHelper'
import { build } from '@layerzerolabs/devtools-move/tasks/move/build'
import { getMoveTomlAdminName, getNamedAddresses } from '@layerzerolabs/devtools-move/tasks/move/utils/config'

task('lz:sdk:move:build', 'Build Move contracts')
    .addParam('oappConfig', 'Path to layerzero config')
    .addParam('oappType', 'Type of oapp')
    .addFlag('forceBuild', 'Force build even if build exists')
    .setAction(async ({ oappConfig, oappType, forceBuild }) => {
        const ctx = await initializeDeployTaskContext(oappConfig)
        const adminName = getMoveTomlAdminName(oappType)
        const named = await getNamedAddresses(ctx.chain, ctx.stage, adminName, ctx.selectedContract)
        await build(ctx, !!forceBuild, named)
    })
