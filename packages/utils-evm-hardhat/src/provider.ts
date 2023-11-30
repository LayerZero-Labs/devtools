import type { Web3Provider } from '@ethersproject/providers'
import type { ProviderFactory } from '@layerzerolabs/utils-evm'
import type { HardhatRuntimeEnvironment } from 'hardhat/types'
import pMemoize from 'p-memoize'
import { createNetworkEnvironmentFactory, getDefaultRuntimeEnvironment, wrapEIP1193Provider } from './runtime'

export const createProviderFactory = (
    hre: HardhatRuntimeEnvironment = getDefaultRuntimeEnvironment(),
    networkEnvironmentFactory = createNetworkEnvironmentFactory(hre)
): ProviderFactory<Web3Provider> => {
    return pMemoize(async (eid) => {
        const env = await networkEnvironmentFactory(eid)

        return wrapEIP1193Provider(env.network.provider)
    })
}
