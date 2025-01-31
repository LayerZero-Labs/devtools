import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'
import { transferObjectOwner } from '../../tasks/move/transferObjectOwner'

class MoveTransferObjectOwnerOperation implements INewOperation {
    vm = 'move'
    operation = 'transfer-object-owner'
    description = 'Transfer Aptos Move OApp Ownership'
    reqArgs = ['new_owner', 'oapp_config']

    async impl(args: any): Promise<void> {
        await transferObjectOwner(args.new_owner, args.oapp_config)
    }
}

const NewOperation = new MoveTransferObjectOwnerOperation()
export { NewOperation }
