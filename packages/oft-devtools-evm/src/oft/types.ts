import { BigNumberish, BytesLike } from 'ethers'

import { OmniAddress, OmniPoint, OmniSDKFactory, OmniTransaction } from '@layerzerolabs/devtools'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { MessagingFee } from '@layerzerolabs/protocol-devtools'

import { OFT } from './sdk'
export interface SendParam {
    dstEid: EndpointId
    to: OmniAddress
    amountLD: BigNumberish
    minAmountLD: BigNumberish
    extraOptions: BytesLike
    composeMsg: BytesLike
    oftCmd: BytesLike
}

export interface IOFT {
    send(sendParam: SendParam, msgFee: MessagingFee, refundAddress: OmniAddress): Promise<OmniTransaction>
    quoteSend(sendParam: SendParam, payInLzToken: boolean): Promise<MessagingFee>
}

export type OFTFactory<TOmniPoint = OmniPoint> = OmniSDKFactory<OFT, TOmniPoint>
