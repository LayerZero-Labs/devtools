import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'

import { deploy } from '../../tasks/move/deploy'
import { setDelegate } from '../../tasks/move/setDelegate'

import { getMoveTomlAdminName, getNamedAddresses } from '../../tasks/move/utils/config'
import { initializeDeployTaskContext, initializeTaskContext } from '../../sdk/baseTaskHelper'

class MoveDeployOperation implements INewOperation {
    vm = 'move'
    operation = 'deploy'
    description = 'Deploy Aptos Move contracts'
    reqArgs = ['oapp_config', 'address_name']

    addArgs = [
        {
            name: '--address-name',
            arg: {
                help: 'The named address for compiling and using in the contract. This will take the derived account address for the object and put it in this location',
                required: false,
            },
        },
        {
            name: '--oapp-type',
            arg: {
                help: 'The type of OApp that is being deployed. Options are "oapp" and "oft". Use type "oft" for any OFTs including adapters.',
                required: false,
            },
        },
        {
            name: '--force-deploy',
            arg: {
                help: 'Include tag "--force-deploy" to force the deploy to run even if the Aptos CLI version is too old.',
                required: false,
            },
        },
    ]

    async impl(args: any): Promise<void> {
        const deployTaskContext = await initializeDeployTaskContext(args.oapp_config)

        const forceDeploy = args.force_deploy ? true : false
        const moveTomlAdminName = getMoveTomlAdminName(args.oapp_type)
        const namedAddresses = await getNamedAddresses(
            deployTaskContext.chain,
            deployTaskContext.stage,
            moveTomlAdminName,
            deployTaskContext.selectedContract
        )
        await deploy(deployTaskContext, args.address_name, forceDeploy, namedAddresses)

        if (deployTaskContext.chain == 'initia') {
            // rest for 2 seconds to allow for the initia chain to update before setting the delegate
            await new Promise((resolve) => setTimeout(resolve, 2000))
        }

        const taskContext = await initializeTaskContext(args.oapp_config)
        await setDelegate(taskContext)
    }
}

const NewOperation = new MoveDeployOperation()
export { NewOperation }
