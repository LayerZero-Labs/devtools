import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'
import { transferOAppOwner } from '../../tasks/move/transferOwnerOapp'

class MoveTransferOwnerOperation implements INewOperation {
    vm = 'move'
    operation = 'transfer-oapp-owner'
    description = 'Transfer Aptos Move OApp Ownership'
    reqArgs = ['new_owner']

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
        await transferOAppOwner(args.new_owner)
    }
}

const NewOperation = new MoveTransferOwnerOperation()
export { NewOperation }
