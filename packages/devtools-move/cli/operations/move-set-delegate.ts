import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'
import { setDelegate } from '../../tasks/move/setDelegate'

class MoveDeployOperation implements INewOperation {
    vm = 'move'
    operation = 'set-delegate'
    description = 'Set Aptos Move delegate'
    reqArgs = ['lz_config']

    async impl(args: any): Promise<void> {
        await setDelegate(args)
    }
}

const NewOperation = new MoveDeployOperation()
export { NewOperation }
