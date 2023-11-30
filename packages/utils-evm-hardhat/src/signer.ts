import type { JsonRpcSigner } from '@ethersproject/providers'
import type { SignerFactory } from '@layerzerolabs/utils-evm'
import type { HardhatRuntimeEnvironment } from 'hardhat/types'
import pMemoize from 'p-memoize'
import { createNetworkEnvironmentFactory, getDefaultRuntimeEnvironment, wrapEIP1193Provider } from './runtime'

export const createSignerFactory = (
    addressOrIndex?: string | number,
    hre: HardhatRuntimeEnvironment = getDefaultRuntimeEnvironment(),
    networkEnvironmentFactory = createNetworkEnvironmentFactory(hre)
): SignerFactory<JsonRpcSigner> => {
    return pMemoize(async (eid) => {
        const env = await networkEnvironmentFactory(eid)

        return wrapEIP1193Provider(env.network.provider).getSigner(addressOrIndex)
    })
}
