import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'

import { setFee } from '../../tasks/setFee'
import { OFTType } from '@layerzerolabs/devtools-move/sdk/oft'

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
        await setFee(BigInt(args.fee_bps), args.to_eid, OFTType.OFT_ADAPTER_FA, args.oapp_config)
    }
}

const NewOperation = new AdapterSetFee()
export { NewOperation }
