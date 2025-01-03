import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'
import { wireEvm } from '../../tasks/evm/wire-evm'

class EVMWireOperation implements INewOperation {
    vm = 'evm'
    operation = 'wire'
    reqArgs = ['lz_config']

    async impl(args: any): Promise<void> {
        await wireEvm(args)
    }
}

const NewOperation = new EVMWireOperation()
export { NewOperation }
