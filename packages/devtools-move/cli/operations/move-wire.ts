import { INewOperation } from '@layerzerolabs/devtools-extensible-cli/cli/types/NewOperation'
import { wireMove } from '../../tasks/move/wireMove'
import { initializeTaskContext } from '../../sdk/baseTaskHelper'

class MoveWireOperation implements INewOperation {
    vm = 'move'
    operation = 'wire'
    description = 'Wire Aptos Move contracts'
    reqArgs = ['oapp_config']

    async impl(args: any): Promise<void> {
        const taskContext = await initializeTaskContext(args.oapp_config)
        await wireMove(taskContext)
    }
}

const NewOperation = new MoveWireOperation()
export { NewOperation }
