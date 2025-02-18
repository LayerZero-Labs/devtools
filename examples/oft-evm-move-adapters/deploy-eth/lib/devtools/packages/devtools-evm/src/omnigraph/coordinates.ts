import type { OmniPoint } from '@layerzerolabs/devtools'
import type { OmniContract } from './types'
import { Provider } from '@/provider/types'

export const omniContractToPoint = ({ eid, contract }: OmniContract): OmniPoint => ({
    eid,
    address: contract.address,
})

export const connectOmniContract = ({ eid, contract }: OmniContract, provider: Provider): OmniContract => ({
    eid,
    contract: contract.connect(provider),
})
