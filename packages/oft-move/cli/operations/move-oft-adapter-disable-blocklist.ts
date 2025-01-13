import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'

import { irrevocablyDisableBlocklist } from '../../tasks/irrevocablyDisableBlocklist'
import { OFTType } from '@layerzerolabs/devtools-move/sdk/oft'

class AdapterIrrevocablyDisableBlocklist implements INewOperation {
    vm = 'move'
    operation = 'adapter-permanently-disable-blocklist'
    description = 'Permanently disable the ability to blocklist wallets for your OFT Adapter'
    reqArgs = []

    async impl(): Promise<void> {
        await irrevocablyDisableBlocklist(OFTType.OFT_ADAPTER_FA)
    }
}

const NewOperation = new AdapterIrrevocablyDisableBlocklist()
export { NewOperation }
