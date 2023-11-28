import type { OmniPoint } from '@layerzerolabs/ua-utils'
import type { OmniContract } from './types'

export const omniContractToPoint = ({ eid, contract }: OmniContract): OmniPoint => ({
    eid,
    address: contract.address,
})
