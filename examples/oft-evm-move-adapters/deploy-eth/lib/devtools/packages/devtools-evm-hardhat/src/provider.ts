import type { JsonRpcProvider } from '@ethersproject/providers'
import type { ProviderFactory } from '@layerzerolabs/devtools-evm'
import pMemoize from 'p-memoize'
import { createGetHreByEid, wrapEIP1193Provider } from './runtime'

export const createProviderFactory = (
    networkEnvironmentFactory = createGetHreByEid()
): ProviderFactory<JsonRpcProvider> => {
    return pMemoize(async (eid) => {
        const env = await networkEnvironmentFactory(eid)

        return wrapEIP1193Provider(env.network.provider)
    })
}
