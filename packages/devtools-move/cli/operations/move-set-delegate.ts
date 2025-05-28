import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'
import { setDelegate } from '../../tasks/move/setDelegate'
import { initializeTaskContext } from '../../sdk/baseTaskHelper'

class MoveDeployOperation implements INewOperation {
    vm = 'move'
    operation = 'set-delegate'
    description = 'Set Aptos Move delegate'
    reqArgs = ['oapp_config']

    async impl(args: any): Promise<void> {
        const taskContext = await initializeTaskContext(args.oapp_config)
        await setDelegate(taskContext)
    }
}

const NewOperation = new MoveDeployOperation()
export { NewOperation }
