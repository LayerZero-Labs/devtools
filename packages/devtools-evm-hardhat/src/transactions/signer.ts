import pMemoize from 'p-memoize'
import type { OmniSignerFactory } from '@layerzerolabs/devtools'
import { GnosisOmniSignerEVM, OmniSignerEVM } from '@layerzerolabs/devtools-evm'
import { createProviderFactory } from '@/provider'
import { createGetHreByEid } from '@/runtime'

export const createSignerFactory = (
    addressOrIndex?: string | number,
    providerFactory = createProviderFactory(),
    networkEnvironmentFactory = createGetHreByEid()
): OmniSignerFactory => {
    return pMemoize(async (eid) => {
        const provider = await providerFactory(eid)
        const signer = provider.getSigner(addressOrIndex)

        const env = await networkEnvironmentFactory(eid)
        const safeConfig = env.network.config.safeConfig
        return safeConfig
            ? new GnosisOmniSignerEVM(eid, signer, safeConfig.safeUrl, safeConfig)
            : new OmniSignerEVM(eid, signer)
    })
}
