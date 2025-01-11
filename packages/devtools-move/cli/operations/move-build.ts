import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'
import { build as buildMove } from '../../tasks/move/build'

class MoveBuildOperation implements INewOperation {
    vm = 'move'
    operation = 'build'
    description = 'Build Aptos Move contracts'
    reqArgs = ['oapp_config', 'named_addresses']

    async impl(args: any): Promise<void> {
        await buildMove(args)
    }
}

const NewOperation = new MoveBuildOperation()
export { NewOperation }
