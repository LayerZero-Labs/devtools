import type { HardhatRuntimeEnvironment, EthereumProvider } from 'hardhat/types'

import pMemoize from 'p-memoize'
import type { JsonRpcProvider } from '@ethersproject/providers'
import { ConfigurationError } from './errors'
import { HardhatContext } from 'hardhat/internal/context'
import { Environment as HardhatRuntimeEnvironmentImplementation } from 'hardhat/internal/core/runtime-environment'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { EndpointBasedFactory, Factory, formatEid } from '@layerzerolabs/devtools'
import { EthersProviderWrapper } from '@nomiclabs/hardhat-ethers/internal/ethers-provider-wrapper'
import assert from 'assert'

/**
 * Helper type for when we need to grab something asynchronously by the network name
 */
export type GetByNetwork<TValue> = Factory<[networkName: string], TValue>

/**
 * Helper type for when we need to grab something asynchronously by the network name
 */
export type GetByEid<TValue> = Factory<[eid: EndpointId], TValue>

/**
 * Returns the default hardhat context for the project, i.e.
 * the context that the project has been setup with.
 *
 * Throws if there is no context.
 *
 * @returns {HardhatContext}
 */
export const getDefaultContext = (): HardhatContext => {
    // Context is registered globally as a singleton and can be accessed
    // using the static methods of the HardhatContext class
    //
    // In our case we require the context to exist, the other option would be
    // to create it and set it up - see packages/hardhat-core/src/register.ts for an example setup
    try {
        return HardhatContext.getHardhatContext()
    } catch (error: unknown) {
        throw new ConfigurationError(`Could not get Hardhat context: ${error}`)
    }
}

/**
 * Returns the default `HardhatRuntimeEnvironment` (`hre`) for the project.
 *
 * Throws if there is no `HardhatRuntimeEnvironment`.
 *
 * @returns {HardhatRuntimeEnvironment}
 */
export const getDefaultRuntimeEnvironment = (): HardhatRuntimeEnvironment => {
    // The first step is to get the hardhat context
    const context = getDefaultContext()

    // We require the hardhat environment to already exist
    //
    // Again, we could create it but that means we'd need to duplicate the bootstrap code
    // that hardhat does when setting up the environment
    try {
        return context.getHardhatRuntimeEnvironment()
    } catch (error: unknown) {
        throw new ConfigurationError(`Could not get Hardhat Runtime Environment: ${error}`)
    }
}

/**
 * Creates a clone of the HardhatRuntimeEnvironment for a particular network
 *
 * ```typescript
 * const env = getHreByNetworkName("bsc-testnet");
 *
 * // All the ususal properties are present
 * env.deployments.get("MyContract")
 * ```
 *
 * @returns {Promise<HardhatRuntimeEnvironment>}
 */
export const getHreByNetworkName: GetByNetwork<HardhatRuntimeEnvironment> = pMemoize(async (networkName) => {
    const context = getDefaultContext()
    const environment = getDefaultRuntimeEnvironment()

    try {
        // The last step is to create a duplicate enviornment that mimics the original one
        // with one crucial difference - the network setup
        return new HardhatRuntimeEnvironmentImplementation(
            environment.config,
            {
                ...environment.hardhatArguments,
                network: networkName,
            },
            environment.tasks,
            environment.scopes,
            context.environmentExtenders,
            context.experimentalHardhatNetworkMessageTraceHooks,
            environment.userConfig,
            context.providerExtenders
            // This is a bit annoying - the environmentExtenders are not stronly typed
            // so TypeScript complains that the properties required by HardhatRuntimeEnvironment
            // are not present on HardhatRuntimeEnvironmentImplementation
        ) as unknown as HardhatRuntimeEnvironment
    } catch (error: unknown) {
        throw new ConfigurationError(`Could not setup Hardhat Runtime Environment: ${error}`)
    }
})

/**
 * Creates a clone of the HardhatRuntimeEnvironment for a particular network
 * identified by endpoint ID
 *
 * ```typescript
 * const getHreByEid = createGetHreByEid()
 * const env = await getHreByEid(EndpointId.AVALANCHE_V2_TESTNET);
 *
 * // All the ususal properties are present
 * env.deployments.get("MyContract")
 * ```
 *
 * @returns {Promise<HardhatRuntimeEnvironment>}
 */
export const createGetHreByEid = (
    hre = getDefaultRuntimeEnvironment()
): EndpointBasedFactory<HardhatRuntimeEnvironment> =>
    pMemoize(async (eid: EndpointId) => getHreByNetworkName(getNetworkNameForEid(eid, hre)))

/**
 * Helper function that wraps an EthereumProvider with EthersProviderWrapper
 * so that we can use it further with ethers as a regular JsonRpcProvider
 *
 * @param {EIP1193Provider} provider
 * @returns {JsonRpcProvider}
 */
export const wrapEIP1193Provider = (provider: EthereumProvider): JsonRpcProvider => new EthersProviderWrapper(provider)

/**
 * Gets an EndpointId defined in the hardhat config
 * for a particular network name (as an `eid` property).
 *
 * Throws if the network or the eid are not defined
 *
 * @param {string} networkName
 * @param {HardhatRuntimeEnvironment | undefined} [hre]
 * @returns {EndpointId}
 */
export const getEidForNetworkName = (
    networkName: string,
    hre: HardhatRuntimeEnvironment = getDefaultRuntimeEnvironment()
): EndpointId => {
    const networkConfig = hre.config.networks[networkName]
    assert(networkConfig, `Network '${networkName}' is not defined in hardhat config`)
    assert(networkConfig.eid != null, `Network '${networkName}' does not have 'eid' property defined in its config`)

    return networkConfig.eid
}

/**
 * Gets a network name with its `eid` property matching
 * a particular `eid`
 *
 * Throws if there is no such network or if there are multiple
 * networks defined with the same `eid`
 *
 * @param {EndpointId} eid
 * @param {HardhatRuntimeEnvironment | undefined} [hre]
 * @returns {string}
 */
export const getNetworkNameForEid = (
    eid: EndpointId,
    hre: HardhatRuntimeEnvironment = getDefaultRuntimeEnvironment()
): string => {
    const networkNames: string[] = []

    for (const [networkName, networkConfig] of Object.entries(hre.config.networks)) {
        // This is basically just an extra condition that ensures that even if the user
        // passes undefined / null despite the TypeScript telling them not to, they won't get a messed up return value
        if (networkConfig.eid == null) continue

        if (eid === networkConfig.eid) networkNames.push(networkName)
    }

    // Here we error out of the user by accident specified the same eid for multiple networks
    assert(
        networkNames.length < 2,
        `Multiple networks found with 'eid' set to ${eid} (${formatEid(eid)}): ${networkNames.join(', ')}`
    )

    // Here we error out if there are no networks with this eid
    const networkName = networkNames.at(0)
    assert(networkName, `Could not find a network for eid ${eid} (${formatEid(eid)})`)

    return networkName
}
