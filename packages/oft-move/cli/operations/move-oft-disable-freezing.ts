import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'

import { permanentlyDisableFreezing } from '../../tasks/permanentlyDisableFreezing'

class IrrevocablyDisableFreezing implements INewOperation {
    vm = 'move'
    operation = 'permanently-disable-freezing'
    description = `
Permanently disable the ability to freeze a primary fungible store through the OFT
This will permanently prevent freezing of new accounts. It will not prevent unfreezing accounts, and existing
frozen accounts will remain frozen until unfrozen`

    reqArgs = ['oapp_config']

    async impl(args: any): Promise<void> {
        await permanentlyDisableFreezing(args.oapp_config)
    }
}

const NewOperation = new IrrevocablyDisableFreezing()
export { NewOperation }
