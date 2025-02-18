import type {
    HardhatRuntimeEnvironment,
    EthereumProvider,
    ConfigurableTaskDefinition,
    HardhatArguments,
} from 'hardhat/types'

import pMemoize from 'p-memoize'
import type { JsonRpcProvider } from '@ethersproject/providers'
import { ConfigurationError } from './errors'
import { HardhatContext } from 'hardhat/internal/context'
import { loadConfigAndTasks } from 'hardhat/internal/core/config/config-loading'
import { Environment as HardhatRuntimeEnvironmentImplementation } from 'hardhat/internal/core/runtime-environment'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { EndpointBasedFactory, Factory, formatEid } from '@layerzerolabs/devtools'
import { EthersProviderWrapper } from '@nomiclabs/hardhat-ethers/internal/ethers-provider-wrapper'
import assert from 'assert'
import memoize from 'micro-memoize'
import { subtask, task } from 'hardhat/config'

/**
 * Helper type for when we need to grab something asynchronously by the network name
 */
export type GetByNetwork<TValue> = Factory<[networkName: string], TValue>

/**
 * Helper type for when we need to grab something asynchronously by the network name
 */
export type GetByEid<TValue> = Factory<[eid: EndpointId], TValue>

/**
 * Creates and sets the default hardhat context.
 *
 * This function will fail if a context has already been created
 */
export const createDefaultContext = (hardhatArguments: Partial<HardhatArguments> = {}) => {
    const ctx = HardhatContext.createHardhatContext()
    const resolvedArguments: HardhatArguments = {
        showStackTraces: false,
        version: false,
        help: false,
        emoji: false,
        verbose: false,
        ...hardhatArguments,
    }
    const { resolvedConfig, userConfig } = loadConfigAndTasks(resolvedArguments)
    const envExtenders = ctx.environmentExtenders
    const providerExtenders = ctx.providerExtenders
    const taskDefinitions = ctx.tasksDSL.getTaskDefinitions()
    const scopesDefinitions = ctx.tasksDSL.getScopesDefinitions()
    const env = new HardhatRuntimeEnvironmentImplementation(
        resolvedConfig,
        resolvedArguments,
        taskDefinitions,
        scopesDefinitions,
        envExtenders,
        userConfig,
        providerExtenders
    )

    ctx.setHardhatRuntimeEnvironment(env as unknown as HardhatRuntimeEnvironment)
}

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
        // The last step is to create a duplicate environment that mimics the original one
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
 * Throws if there are multiple networks defined with the same `eid`.
 *
 * Returns `undefined` if there is no network with given `eid`
 *
 * @param {EndpointId} eid
 * @param {HardhatRuntimeEnvironment | undefined} [hre]
 * @returns {string | undefined}
 */
export const getNetworkNameForEidMaybe = (
    eid: EndpointId,
    hre: HardhatRuntimeEnvironment = getDefaultRuntimeEnvironment()
): string | undefined => {
    // We are using getEidsByNetworkName to get the nice validation of network config
    const eidsByNetworkName = getEidsByNetworkName(hre)

    for (const [networkName, networkEid] of Object.entries(eidsByNetworkName)) {
        if (networkEid === eid) {
            return networkName
        }
    }

    return undefined
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
    const networkName = getNetworkNameForEidMaybe(eid, hre)

    // Here we error out if there are no networks with this eid
    return assert(networkName != null, `Could not find a network for eid ${eid} (${formatEid(eid)})`), networkName
}

/**
 * Gets a record containing the mapping between network names and endpoint IDs.
 * Will also return the network names for which the `eid` has not been defined
 *
 * Throws if there are multiple networks defined with the same `eid`
 *
 * @param {HardhatRuntimeEnvironment | undefined} [hre]
 * @returns {Record<string, EndpointId | undefined>}
 */
export const getEidsByNetworkName = memoize(
    (hre: HardhatRuntimeEnvironment = getDefaultRuntimeEnvironment()): Record<string, EndpointId | undefined> => {
        // First we get the network name -> network config pairs
        const networkEntries = Object.entries(hre.config.networks)
        // And map the network config to an endpoint ID
        const eidEntries = networkEntries.map(
            ([networkName, networkConfig]) => [networkName, networkConfig.eid] as const
        )
        // Now we turn the entries back into a record
        const eidsByNetworkName = Object.fromEntries(eidEntries)

        // Now we check that the user has not configured the endpoint ID mapping incorrectly
        // (i.e. there are more networks configured with the same endpoint ID)
        //
        // For this we'll drop all the networks whose endpoint IDs are not defined
        const eidEntriesWithDefinedEid = eidEntries.filter(([_, eid]) => eid != null)
        const definedEidsByNetworkName = Object.fromEntries(eidEntriesWithDefinedEid)

        // Now we grab the sets of unique network names and endpoint IDs
        const allDefinedEids = new Set(Object.values(definedEidsByNetworkName))
        const allNetworkNames = new Set(Object.keys(definedEidsByNetworkName))

        // If the number of unique networks matches the number of unique endpoint IDs, there are no duplicates
        if (allDefinedEids.size === allNetworkNames.size) {
            return eidsByNetworkName
        }

        // At this point the number of defined endpoint IDs can only be lower than
        // the number of defined network names (since network names are taken from the keys
        // of an object and endpoint IDs from its values)
        //
        // To let the user know whihc networks to fix, we need to grab all the ones that
        // have been duplicated
        //
        // We are not claiming any efficiency of this algorithm as we don't expect any large numbers of networks
        const duplicatedNetworkNames = Array.from(allDefinedEids)
            // First we grab all the network names with this endpoint ID
            .map((eid) =>
                eidEntriesWithDefinedEid.flatMap(([networkName, definedEid]) =>
                    eid === definedEid ? [networkName] : []
                )
            )
            // Then we find all the network names listed more than once
            .filter((networkNames) => networkNames.length > 1)

        // Now we let the user know which network names have identical endpoint IDs
        const messages = duplicatedNetworkNames
            .map(
                (networkNames) =>
                    `- ${networkNames.join(', ')} have eid set to ${formatEid(eidsByNetworkName[networkNames[0]!]!)}`
            )
            .join('\n')

        throw new Error(
            `Found multiple networks configured with the same 'eid':\n\n${messages}\n\nPlease fix this in your hardhat config.`
        )
    }
)

/**
 * Helper utility that copies the whole task definition under a new name
 *
 * This is useful if a new task needs to have the same interface as an existing task,
 * for example if we want to create a slightly modified version of a wire task
 * without needing to retype all the `.addFlag` and `.addOption`
 *
 * @param {string} parentTaskName Task to inherit the options and the action from
 * @param {HardhatRuntimeEnvironment} [hre]
 * @returns {(taskName: string) => ConfigurableTaskDefinition}
 */
export const inheritTask =
    (parentTaskName: string, context = getDefaultContext()) =>
    (taskName: string): ConfigurableTaskDefinition => {
        // For now we only support non-scoped tasks
        const parentTaskDefinition = context.tasksDSL.getTaskDefinition(undefined, parentTaskName)
        assert(parentTaskDefinition != null, `Missing task definition for ${parentTaskName}`)

        // First we create the task definition itself
        const creator = parentTaskDefinition.isSubtask ? subtask : task
        const childTask = creator(taskName).setAction(parentTaskDefinition.action)

        // Then we start setting properties
        if (parentTaskDefinition.description != null) {
            childTask.setDescription(parentTaskDefinition.description)
        }

        // Params go first (just because I said so, not for any particular reason)
        for (const definition of Object.values(parentTaskDefinition.paramDefinitions)) {
            // Params need to be treated based on their type (flag/param)
            if (definition.isFlag) {
                childTask.addFlag(definition.name, definition.description)
            } else {
                childTask.addParam(
                    definition.name,
                    definition.description,
                    definition.defaultValue,
                    definition.type,
                    definition.isOptional
                )
            }
        }

        // Positional params go second
        for (const definition of parentTaskDefinition.positionalParamDefinitions) {
            if (definition.isVariadic) {
                childTask.addVariadicPositionalParam(
                    definition.name,
                    definition.description,
                    definition.defaultValue,
                    definition.type,
                    definition.isOptional
                )
            } else {
                childTask.addPositionalParam(
                    definition.name,
                    definition.description,
                    definition.defaultValue,
                    definition.type,
                    definition.isOptional
                )
            }
        }

        return childTask
    }
