import { task } from 'hardhat/config'

import { initializeDeployTaskContext, initializeTaskContext } from '@layerzerolabs/devtools-move/sdk/baseTaskHelper'
import { deploy } from '@layerzerolabs/devtools-move/tasks/move/deploy'
import { setDelegate } from '@layerzerolabs/devtools-move/tasks/move/setDelegate'
import { getMoveTomlAdminName, getNamedAddresses } from '@layerzerolabs/devtools-move/tasks/move/utils/config'

task('lz:oft:aptos:deploy', 'Deploy Move contracts')
    .addParam('oappConfig', 'Path to layerzero config')
    .addParam('addressName', 'Named address for deploy')
    .addParam('oappType', 'Type of oapp')
    .addFlag('forceDeploy', 'Force deploy even if version mismatch')
    .setAction(async ({ oappConfig, addressName, oappType, forceDeploy }) => {
        const ctx = await initializeDeployTaskContext(oappConfig)
        const adminName = getMoveTomlAdminName(oappType)
        const named = await getNamedAddresses(ctx.chain, ctx.stage, adminName, ctx.selectedContract)
        await deploy(ctx, addressName, !!forceDeploy, named)
        const taskCtx = await initializeTaskContext(oappConfig)
        await setDelegate(taskCtx)
    })
