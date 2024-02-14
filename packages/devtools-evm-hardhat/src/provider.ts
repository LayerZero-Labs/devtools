import type { ProviderFactory } from '@layerzerolabs/devtools-evm'
import pMemoize from 'p-memoize'
import { createGetHreByEid, wrapEIP1193Provider } from './runtime'
import { HardhatEthersProvider } from '@nomicfoundation/hardhat-ethers/internal/hardhat-ethers-provider'

export const createProviderFactory = (
    networkEnvironmentFactory = createGetHreByEid()
): ProviderFactory<HardhatEthersProvider> => {
    return pMemoize(async (eid) => {
        const env = await networkEnvironmentFactory(eid)

        return wrapEIP1193Provider(env.network.provider, env.network.name)
    })
}
