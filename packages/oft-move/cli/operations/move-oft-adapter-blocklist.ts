import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'

import { blocklistWallet } from '../../tasks/blocklistWallet'
import { OFTType } from '@layerzerolabs/devtools-move/sdk/oft'

class AdapterBlocklistWallet implements INewOperation {
    vm = 'move'
    operation = 'adapter-blocklist-wallet'
    description =
        'Set the blocklist status of a wallet for your OFT to either true or false, where true blocks the wallet and false unblocks it'
    reqArgs = ['wallet_address', 'block']

    addArgs = [
        {
            name: '--block',
            arg: {
                help: 'true to block, false to unblock',
                required: false,
            },
        },
        {
            name: '--wallet-address',
            arg: {
                help: 'wallet address to block or unblock',
                required: false,
            },
        },
    ]

    async impl(args: any): Promise<void> {
        await blocklistWallet(args.wallet_address, args.block, OFTType.OFT_ADAPTER_FA)
    }
}

const NewOperation = new AdapterBlocklistWallet()
export { NewOperation }
