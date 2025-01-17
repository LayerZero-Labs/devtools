import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'

import { freezeWallet } from '../../tasks/freezeWallet'
import { OFTType } from '@layerzerolabs/devtools-move/sdk/oft'

class FreezeWallet implements INewOperation {
    vm = 'move'
    operation = 'freeze-wallet'
    description =
        'Set the frozen status of a wallet for your OFT to either true or false, where true freezes the wallet and false unfreezes it'
    reqArgs = ['wallet_address', 'freeze']

    addArgs = [
        {
            name: '--freeze',
            arg: {
                help: 'true to freeze, false to unfreeze',
                required: false,
            },
        },
        {
            name: '--wallet-address',
            arg: {
                help: 'wallet address to freeze or unfreeze',
                required: false,
            },
        },
    ]

    async impl(args: any): Promise<void> {
        const freeze = args.freeze === 'true'
        await freezeWallet(args.wallet_address, freeze, OFTType.OFT_FA)
    }
}

const NewOperation = new FreezeWallet()
export { NewOperation }
