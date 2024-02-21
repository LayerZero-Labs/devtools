import pMemoize from 'p-memoize'
import type { OmniSignerFactory } from '@layerzerolabs/devtools'
import { GnosisOmniSignerEVM, OmniSignerEVM } from '@layerzerolabs/devtools-evm'
import { createProviderFactory } from '@/provider'
import { createGetHreByEid } from '@/runtime'

export const createSignerFactory = (
    addressOrIndex?: string | number,
    providerFactory = createProviderFactory()
): OmniSignerFactory<OmniSignerEVM> => {
    return pMemoize(async (eid) => {
        const provider = await providerFactory(eid)
        const signer = provider.getSigner(addressOrIndex)

        return new OmniSignerEVM(eid, signer)
    })
}

export const createGnosisSignerFactory = (
    addressOrIndex?: string | number,
    providerFactory = createProviderFactory(),
    networkEnvironmentFactory = createGetHreByEid()
): OmniSignerFactory<GnosisOmniSignerEVM> => {
    return pMemoize(async (eid) => {
        const provider = await providerFactory(eid)
        const signer = provider.getSigner(addressOrIndex)

        const env = await networkEnvironmentFactory(eid)
        const safeConfig = env.network.config.safeConfig
        if (!safeConfig) {
            throw new Error('No safe config found for the current network')
        }
        return new GnosisOmniSignerEVM(eid, signer, safeConfig.safeUrl, safeConfig)
    })
}
