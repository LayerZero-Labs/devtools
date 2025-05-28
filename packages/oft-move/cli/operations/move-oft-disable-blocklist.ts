import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'

import { irrevocablyDisableBlocklist } from '../../tasks/irrevocablyDisableBlocklist'
import { OFTType, initializeTaskContext } from '@layerzerolabs/devtools-move'

class IrrevocablyDisableBlocklist implements INewOperation {
    vm = 'move'
    operation = 'permanently-disable-blocklist'
    description = 'Permanently disable the ability to blocklist wallets for your OFT'
    reqArgs = ['oapp_config']

    async impl(args: any): Promise<void> {
        const taskContext = await initializeTaskContext(args.oapp_config)
        await irrevocablyDisableBlocklist(taskContext, OFTType.OFT_FA)
    }
}

const NewOperation = new IrrevocablyDisableBlocklist()
export { NewOperation }
