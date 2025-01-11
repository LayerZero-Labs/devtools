import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'

import mintToMoveVM from '../../tasks/mintToMoveVM'

class MintToMoveOFT implements INewOperation {
    vm = 'move'
    operation = 'mint-to-move-oft'
    description = 'Mint tokens to a Move OFT'
    reqArgs = ['amount_ld', 'to_address']

    async impl(args: any): Promise<void> {
        await mintToMoveVM(args.amount_ld, args.to_address)
    }
}

const NewOperation = new MintToMoveOFT()
export { NewOperation }
