import { INewOperation } from '@layerzerolabs/devtools-extensible-cli/cli/types/NewOperation'

import { setFee } from '../../tasks/setFee'
import { OFTType } from '@layerzerolabs/devtools-move/sdk/IOFT'
import { initializeTaskContext } from '@layerzerolabs/devtools-move/sdk/baseTaskHelper'

class SetFee implements INewOperation {
    vm = 'move'
    operation = 'set-fee'
    description = 'Set the fee BPS for an OFT'
    reqArgs = ['fee_bps', 'to_eid', 'oapp_config']

    addArgs = [
        {
            name: '--to-eid',
            arg: {
                help: 'destination endpoint id',
                required: false,
            },
        },
        {
            name: '--fee-bps',
            arg: {
                help: 'fee BPS',
                required: false,
            },
        },
    ]

    async impl(args: any): Promise<void> {
        const taskContext = await initializeTaskContext(args.oapp_config)
        await setFee(BigInt(args.fee_bps), args.to_eid, OFTType.OFT_FA, taskContext)
    }
}

const NewOperation = new SetFee()
export { NewOperation }
