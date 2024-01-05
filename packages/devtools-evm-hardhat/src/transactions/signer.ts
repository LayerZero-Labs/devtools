import pMemoize from 'p-memoize'
import type { OmniSignerFactory } from '@layerzerolabs/devtools'
import { OmniSignerEVM } from '@layerzerolabs/devtools-evm'
import { createProviderFactory } from '@/provider'

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
