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
                default: 'false',
            },
        },
        {
            name: '--mnemonic-index',
            arg: {
                help: 'EVM mnemonic index',
                required: false,
                default: '-1',
            },
        },
        {
            name: '--only-calldata',
            arg: {
                help: 'Whether to only generate calldata',
                required: false,
                default: 'false',
            },
        },
    ]

    async impl(args: any): Promise<void> {
        await wireEvm(args)
    }
}

const NewOperation = new EVMWireOperation()
export { NewOperation }
