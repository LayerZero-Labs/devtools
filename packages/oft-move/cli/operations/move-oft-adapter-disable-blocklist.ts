import { INewOperation } from '@layerzerolabs/devtools-extensible-cli/cli/types/NewOperation'

import { irrevocablyDisableBlocklist } from '../../tasks/irrevocablyDisableBlocklist'
import { OFTType } from '@layerzerolabs/devtools-move/sdk/IOFT'
import { initializeTaskContext } from '@layerzerolabs/devtools-move/sdk/baseTaskHelper'

class AdapterIrrevocablyDisableBlocklist implements INewOperation {
    vm = 'move'
    operation = 'adapter-permanently-disable-blocklist'
    description = 'Permanently disable the ability to blocklist wallets for your OFT Adapter'
    reqArgs = ['oapp_config']

    async impl(args: any): Promise<void> {
        const taskContext = await initializeTaskContext(args.oapp_config)
        await irrevocablyDisableBlocklist(taskContext, OFTType.OFT_ADAPTER_FA)
    }
}

const NewOperation = new AdapterIrrevocablyDisableBlocklist()
export { NewOperation }
