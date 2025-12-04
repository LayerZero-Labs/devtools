import pMemoize from 'p-memoize'
import { formatEid, type EndpointBasedFactory, type OmniSignerFactory } from '@layerzerolabs/devtools'
import { GnosisOmniSignerEVM, OmniSignerEVM } from '@layerzerolabs/devtools-evm'
import { createProviderFactory } from '@/provider'
import { createGetHreByEid } from '@/runtime'
import { ConnectSafeConfigWithSafeAddress } from '@safe-global/protocol-kit'
import type { SignerDefinition } from '@layerzerolabs/devtools-evm'
import assert from 'assert'

export const createSignerFactory = (
    definition?: SignerDefinition,
    networkEnvironmentFactory = createGetHreByEid(),
    providerFactory = createProviderFactory(networkEnvironmentFactory),
    signerAddressorIndexFactory = createSignerAddressOrIndexFactory(definition, networkEnvironmentFactory)
): OmniSignerFactory<OmniSignerEVM> => {
    return pMemoize(async (eid) => {
        const provider = await providerFactory(eid)
        const addressOrIndex = await signerAddressorIndexFactory(eid)
        const signer = provider.getSigner(addressOrIndex)

        return new OmniSignerEVM(eid, signer)
    })
}

export const createGnosisSignerFactory = (
    definition?: SignerDefinition,
    networkEnvironmentFactory = createGetHreByEid(),
    providerFactory = createProviderFactory(networkEnvironmentFactory),
    signerAddressorIndexFactory = createSignerAddressOrIndexFactory(definition, networkEnvironmentFactory)
): OmniSignerFactory<GnosisOmniSignerEVM<ConnectSafeConfigWithSafeAddress & { safeApiKey: string }>> => {
    return pMemoize(async (eid) => {
        const provider = await providerFactory(eid)
        const addressOrIndex = await signerAddressorIndexFactory(eid)
        const signer = provider.getSigner(addressOrIndex)

        const env = await networkEnvironmentFactory(eid)
        const chainId = BigInt(await env.getChainId())

        const safeConfig = env.network.config.safeConfig
        if (!safeConfig) {
            throw new Error('No safe config found for the current network')
        }
        return new GnosisOmniSignerEVM<ConnectSafeConfigWithSafeAddress & { safeApiKey: string }>(
            eid,
            signer,
            safeConfig.safeUrl,
            safeConfig,
            chainId
        )
    })
}

/**
 * Factory for signer address/index for a specific eid.
 *
 * Will take an optional signer definition and either:
 *
 * - Return static signer address or index for static signer configuration
 * - Look up named signer account in hardhat config and return its address
 *
 * @param {SignerDefinition} [definition]
 * @param {EndpointBasedFactory<HardhatRuntimeEnvironment>} [networkEnvironmentFactory]
 * @returns
 */
export const createSignerAddressOrIndexFactory =
    (
        definition?: SignerDefinition,
        networkEnvironmentFactory = createGetHreByEid()
    ): EndpointBasedFactory<string | number | undefined> =>
    async (eid) => {
        // If there is no definition provided, we return nothing
        if (definition == null) {
            return undefined
        }

        // The hardcoded address and/or index definitions are easy,
        // they need no resolution and can be used as they are
        if (definition.type === 'address') {
            return definition.address
        }

        if (definition.type === 'index') {
            return definition.index
        }

        // The named definitions need to be resolved using hre
        const hre = await networkEnvironmentFactory(eid)
        const accounts = await hre.getNamedAccounts()
        const account = accounts[definition.name]

        assert(account != null, `Missing named account '${definition.name}' for eid ${formatEid(eid)}`)

        return account
    }
