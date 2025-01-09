import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'

import { build as buildMove } from '../../tasks/move/build'
import { deploy as deployMove } from '../../tasks/move/deploy'
import { setDelegate } from '../../tasks/move/setDelegate'

class MoveDeployOperation implements INewOperation {
    vm = 'move'
    operation = 'deploy'
    description = 'Deploy Aptos Move contracts'
    reqArgs = ['lz_config', 'address_name', 'named_addresses', 'move_deploy_script']

    addArgs = [
        {
            name: '--address-name',
            arg: {
                help: 'address name',
                required: false,
            },
        },
    ]

    async impl(args: any): Promise<void> {
        await buildMove(args)
        await deployMove(args.lz_config, args.named_addresses, args.force_deploy, args.address_name)
        await setDelegate(args, true)
    }
}

const NewOperation = new MoveDeployOperation()
export { NewOperation }
