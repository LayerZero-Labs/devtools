import type { OmniPoint } from '@layerzerolabs/devtools'
import type { OmniContract } from './types'
import { Provider } from '@/provider/types'
import type { Addressable, Contract } from 'ethers'
import assert from 'assert'

function assertContractTarget(value: string | Addressable): asserts value is string {
    assert(typeof value === 'string', 'Contracts using Addressable contract.target are not yet supported')
}

export const omniContractToPoint = ({ eid, contract }: OmniContract): OmniPoint => ({
    eid,
    address: (assertContractTarget(contract.target), contract.target),
})

export const connectOmniContract = ({ eid, contract }: OmniContract, provider: Provider): OmniContract => ({
    eid,
    contract: contract.connect(provider) as Contract,
})
