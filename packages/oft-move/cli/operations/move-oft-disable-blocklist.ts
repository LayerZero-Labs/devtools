import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'

import { irrevocablyDisableBlocklist } from '../../tasks/irrevocablyDisableBlocklist'
import { OFTType } from '@layerzerolabs/devtools-move/sdk/oft'

class IrrevocablyDisableBlocklist implements INewOperation {
    vm = 'move'
    operation = 'permanently-disable-blocklist'
    description = 'Permanently disable the ability to blocklist wallets for your OFT'
    reqArgs = []

    async impl(): Promise<void> {
        await irrevocablyDisableBlocklist(OFTType.OFT_FA)
    }
}

const NewOperation = new IrrevocablyDisableBlocklist()
export { NewOperation }
