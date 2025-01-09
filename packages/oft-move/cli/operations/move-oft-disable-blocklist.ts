import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'

import { irrevocablyDisableBlocklist } from '../../tasks/irrevocablyDisableBlocklist'

class IrrevocablyDisableBlocklist implements INewOperation {
    vm = 'move'
    operation = 'permanently-disable-blocklist'
    description = 'Permanently disable the ability to blocklist wallets for your OFT'
    reqArgs = []

    async impl(): Promise<void> {
        await irrevocablyDisableBlocklist()
    }
}

const NewOperation = new IrrevocablyDisableBlocklist()
export { NewOperation }
