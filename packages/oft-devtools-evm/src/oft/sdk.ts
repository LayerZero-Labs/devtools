import { OmniAddress, makeBytes32 } from '@layerzerolabs/devtools'
import { OmniContract } from '@layerzerolabs/devtools-evm'
import { MessagingFee } from '@layerzerolabs/protocol-devtools'
import { OApp } from '@layerzerolabs/ua-devtools-evm'

import { IOFT, SendParam } from './types'

import type { EndpointV2Factory } from '@layerzerolabs/protocol-devtools'

export class OFT extends OApp implements IOFT {
    constructor(contract: OmniContract, endpointV2Factory: EndpointV2Factory) {
        super(contract, endpointV2Factory)
    }

    async send(sendParam: SendParam, msgFee: MessagingFee, refundAddress: OmniAddress) {
        const data = this.contract.contract.interface.encodeFunctionData('send', [
            [
                sendParam.dstEid,
                makeBytes32(sendParam.to),
                sendParam.amountLD,
                sendParam.minAmountLD,
                sendParam.extraOptions,
                sendParam.composeMsg,
                sendParam.oftCmd,
            ],
            [msgFee.nativeFee, msgFee.lzTokenFee],
            refundAddress,
        ])

        return {
            ...this.createTransaction(data),
            description: `OFT send`,
        }
    }

    async quoteSend(sendParam: SendParam, payInLzToken: boolean): Promise<MessagingFee> {
        const [nativeFee, lzTokenFee] = await this.contract.contract.quoteSend(
            [
                sendParam.dstEid,
                makeBytes32(sendParam.to),
                sendParam.amountLD,
                sendParam.minAmountLD,
                sendParam.extraOptions,
                sendParam.composeMsg,
                sendParam.oftCmd,
            ],
            payInLzToken
        )

        return {
            nativeFee,
            lzTokenFee,
        }
    }
}
