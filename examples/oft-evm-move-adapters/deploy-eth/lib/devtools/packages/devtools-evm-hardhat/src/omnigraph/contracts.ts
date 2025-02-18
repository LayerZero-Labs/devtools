import pMemoize from 'p-memoize'
import { ProviderFactory, connectOmniContract } from '@layerzerolabs/devtools-evm'
import { createContractFactory } from '@/omnigraph/coordinates'
import type { OmniContractFactoryHardhat } from '@/omnigraph/types'
import { createProviderFactory } from '@/provider'

export const createConnectedContractFactory = (
    contractFactory: OmniContractFactoryHardhat = createContractFactory(),
    providerFactory: ProviderFactory = createProviderFactory()
): OmniContractFactoryHardhat =>
    pMemoize(async (point) => {
        const contract = await contractFactory(point)
        const provider = await providerFactory(point.eid)

        return connectOmniContract(contract, provider)
    })
