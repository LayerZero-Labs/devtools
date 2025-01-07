import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'
import { wireMove } from '../../tasks/move/wire'

class MoveWireOperation implements INewOperation {
    vm = 'move'
    operation = 'wire'
    description = 'Wire Aptos Move contracts'
    reqArgs = ['lz_config']

    async impl(args: any): Promise<void> {
        await wireMove(args)
    }
}

const NewOperation = new MoveWireOperation()
export { NewOperation }
