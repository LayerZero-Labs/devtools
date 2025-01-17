import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'

import { blocklistWallet } from '../../tasks/blocklistWallet'
import { OFTType } from '@layerzerolabs/devtools-move/sdk/oft'

class BlocklistWallet implements INewOperation {
    vm = 'move'
    operation = 'blocklist-wallet'
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
        const block = args.block === 'true'
        await blocklistWallet(args.wallet_address, block, OFTType.OFT_FA)
    }
}

const NewOperation = new BlocklistWallet()
export { NewOperation }
