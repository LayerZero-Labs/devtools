import type { JsonRpcProvider } from '@ethersproject/providers'
import type { ProviderFactory } from '@layerzerolabs/utils-evm'
import pMemoize from 'p-memoize'
import { createGetHREByEid, wrapEIP1193Provider } from './runtime'

export const createProviderFactory = (
    networkEnvironmentFactory = createGetHREByEid()
): ProviderFactory<JsonRpcProvider> => {
    return pMemoize(async (eid) => {
        const env = await networkEnvironmentFactory(eid)

        return wrapEIP1193Provider(env.network.provider)
    })
}
