import type { HardhatRuntimeEnvironment } from 'hardhat/types'
import type { OmniSignerFactory } from '@layerzerolabs/utils'
import { OmniSignerEVM } from '@layerzerolabs/utils-evm'
import pMemoize from 'p-memoize'
import { getDefaultRuntimeEnvironment } from '../runtime'
import { createProviderFactory } from '../provider'

export const createSignerFactory = (
    addressOrIndex?: string | number,
    hre: HardhatRuntimeEnvironment = getDefaultRuntimeEnvironment(),
    providerFactory = createProviderFactory(hre)
): OmniSignerFactory<OmniSignerEVM> => {
    return pMemoize(async (eid) => {
        const provider = await providerFactory(eid)
        const signer = provider.getSigner(addressOrIndex)

        return new OmniSignerEVM(eid, signer)
    })
}
