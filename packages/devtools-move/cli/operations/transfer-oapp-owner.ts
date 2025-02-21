import { INewOperation } from '@layerzerolabs/devtools-extensible-cli/cli/types/NewOperation'
import { transferOAppOwner } from '../../tasks/move/transferOwnerOapp'
import { initializeTaskContext } from '../../sdk/baseTaskHelper'

class MoveTransferOwnerOperation implements INewOperation {
    vm = 'move'
    operation = 'transfer-oapp-owner'
    description = 'Transfer Aptos Move OApp Ownership'
    reqArgs = ['new_owner', 'oapp_config']

    addArgs = [
        {
            name: '--new-owner',
            arg: {
                help: 'new owner',
                required: false,
            },
        },
    ]

    async impl(args: any): Promise<void> {
        const taskContext = await initializeTaskContext(args.oapp_config)
        await transferOAppOwner(taskContext, args.new_owner)
    }
}

const NewOperation = new MoveTransferOwnerOperation()
export { NewOperation }
