import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'
import { transferObjectOwner } from '../../tasks/move/transferObjectOwner'
import { initializeTaskContext } from '../../sdk/baseTaskHelper'
class MoveTransferObjectOwnerOperation implements INewOperation {
    vm = 'move'
    operation = 'transfer-object-owner'
    description = 'Transfer Aptos Move OApp Ownership'
    reqArgs = ['new_owner', 'oapp_config']

    async impl(args: any): Promise<void> {
        const taskContext = await initializeTaskContext(args.oapp_config)
        await transferObjectOwner(taskContext, args.new_owner)
    }
}

const NewOperation = new MoveTransferObjectOwnerOperation()
export { NewOperation }
