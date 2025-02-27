import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'

import { setFee } from '../../tasks/setFee'
import { OFTType } from '@layerzerolabs/devtools-move/sdk/IOFT'
import { initializeTaskContext } from '@layerzerolabs/devtools-move/sdk/baseTaskHelper'

class AdapterSetFee implements INewOperation {
    vm = 'move'
    operation = 'adapter-set-fee'
    description = 'Set the fee BPS for an OFT Adapter'
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
        await setFee(BigInt(args.fee_bps), args.to_eid, OFTType.OFT_ADAPTER_FA, taskContext)
    }
}

const NewOperation = new AdapterSetFee()
export { NewOperation }
