import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'
import { build as buildMove } from '../../tasks/move/build'

class MoveBuildOperation implements INewOperation {
    vm = 'move'
    operation = 'build'
    reqArgs = ['lz_config', 'named_addresses', 'move_deploy_script']

    async impl(args: any): Promise<void> {
        await buildMove(args)
    }
}

const NewOperation = new MoveBuildOperation()
export { NewOperation }
