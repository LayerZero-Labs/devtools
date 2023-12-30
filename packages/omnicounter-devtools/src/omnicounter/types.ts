import { Address, OmniTransaction } from '@layerzerolabs/devtools'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { MessagingFee } from '@layerzerolabs/protocol-devtools'

export type IncrementOutput = {
    omniTransaction: OmniTransaction
    messagingFee: MessagingFee
    gasLimit: bigint
}

export interface IOmniCounter {
    increment(eid: EndpointId, type: number, options: Uint8Array, receiver: Address): Promise<IncrementOutput>
}
