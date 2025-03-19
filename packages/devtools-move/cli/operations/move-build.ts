import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'
import { build } from '../../tasks/move/build'

import { getMoveTomlAdminName, getNamedAddresses } from '../../tasks/move/utils/config'
import { initializeDeployTaskContext } from '../../sdk/baseTaskHelper'

class MoveBuildOperation implements INewOperation {
    vm = 'move'
    operation = 'build'
    description = 'Build Aptos Move contracts'
    reqArgs = ['oapp_config', 'oapp_type']

    addArgs = [
        {
            name: '--force-build',
            arg: {
                help: 'Add this flag to force build the contracts (overwrites existing build folder)',
                required: false,
            },
        },
    ]
    async impl(args: any): Promise<void> {
        const taskContext = await initializeDeployTaskContext(args.oapp_config)
        const forceBuild = args.force_build ? true : false

        const moveTomlAdminName = getMoveTomlAdminName(args.oapp_type)
        const named_addresses = await getNamedAddresses(
            taskContext.chain,
            taskContext.stage,
            moveTomlAdminName,
            taskContext.selectedContract
        )

        await build(taskContext, forceBuild, named_addresses)
    }
}

const NewOperation = new MoveBuildOperation()
export { NewOperation }
