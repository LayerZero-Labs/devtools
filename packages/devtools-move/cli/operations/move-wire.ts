import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'
import { wireMove } from '../../tasks/move/wireMove'

class MoveWireOperation implements INewOperation {
    vm = 'move'
    operation = 'wire'
    description = 'Wire Aptos Move contracts'
    reqArgs = ['oapp_config']

    async impl(args: any): Promise<void> {
        await wireMove(args.oapp_config)
    }
}

const NewOperation = new MoveWireOperation()
export { NewOperation }
