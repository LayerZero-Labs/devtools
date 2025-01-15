import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'
import { wireEvm } from '../../tasks/evm/wire-evm'

class EVMWireOperation implements INewOperation {
    vm = 'evm'
    operation = 'wire'
    description = 'Wire EVM contracts'
    reqArgs = ['oapp_config', 'simulate']
    addArgs = [
        {
            name: '--simulate',
            arg: {
                help: 'Whether to simulate the transaction',
                required: false,
                default: 'true',
            },
        },
    ]

    async impl(args: any): Promise<void> {
        await wireEvm(args)
    }
}

const NewOperation = new EVMWireOperation()
export { NewOperation }
