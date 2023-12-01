import pMemoize from 'p-memoize'
import { ProviderFactory, connectOmniContract } from '@layerzerolabs/utils-evm'
import { createContractFactory } from '@/omnigraph/coordinates'
import type { OmniContractFactory } from '@/omnigraph/types'
import { createProviderFactory } from '@/provider'

export const createConnectedContractFactory = (
    contractFactory: OmniContractFactory = createContractFactory(),
    providerFactory: ProviderFactory = createProviderFactory()
): OmniContractFactory =>
    pMemoize(async (point) => {
        const contract = await contractFactory(point)
        const provider = await providerFactory(point.eid)

        return connectOmniContract(contract, provider)
    })
