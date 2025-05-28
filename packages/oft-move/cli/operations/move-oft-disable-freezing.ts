import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'

import { permanentlyDisableFreezing } from '../../tasks/permanentlyDisableFreezing'
import { initializeTaskContext } from '@layerzerolabs/devtools-move'

class IrrevocablyDisableFreezing implements INewOperation {
    vm = 'move'
    operation = 'permanently-disable-freezing'
    description = `
Permanently disable the ability to freeze a primary fungible store through the OFT
This will permanently prevent freezing of new accounts. It will not prevent unfreezing accounts, and existing
frozen accounts will remain frozen until unfrozen`

    reqArgs = ['oapp_config']

    async impl(args: any): Promise<void> {
        const taskContext = await initializeTaskContext(args.oapp_config)
        await permanentlyDisableFreezing(taskContext)
    }
}

const NewOperation = new IrrevocablyDisableFreezing()
export { NewOperation }
