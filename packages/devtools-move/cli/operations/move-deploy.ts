import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'

import { build as buildMove } from '../../tasks/move/build'
import { deploy as deployMove } from '../../tasks/move/deploy'
import { setDelegate } from '../../tasks/move/setDelegate'

class MoveDeployOperation implements INewOperation {
    vm = 'move'
    operation = 'deploy'
    description = 'Deploy Aptos Move contracts'
    reqArgs = ['oapp_config', 'address_name', 'named_addresses', 'move_deploy_script']

    addArgs = [
        {
            name: '--address-name',
            arg: {
                help: 'The named address for compiling and using in the contract. This will take the derived account address for the object and put it in this location',
                required: false,
            },
        },
    ]

    async impl(args: any): Promise<void> {
        await buildMove(args)
        await deployMove(args.oapp_config, args.named_addresses, args.force_deploy, args.address_name)
        await setDelegate(args, true)
    }
}

const NewOperation = new MoveDeployOperation()
export { NewOperation }
