import { OmniAddress, OmniTransaction } from '@layerzerolabs/devtools'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { MessagingFee } from '@layerzerolabs/protocol-devtools'

export type IncrementOutput = {
    omniTransaction: OmniTransaction
    messagingFee: MessagingFee
    gasLimit: bigint
}

export enum IncrementType {
    VANILLA_TYPE = 1,
    COMPOSED_TYPE = 2,
    ABA_TYPE = 3,
    COMPOSED_ABA_TYPE = 4,
}

export interface IOmniCounter {
    increment(
        eid: EndpointId,
        type: IncrementType,
        options: Uint8Array,
        receiver: OmniAddress
    ): Promise<IncrementOutput>
}
