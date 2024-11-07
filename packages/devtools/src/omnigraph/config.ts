import type { Factory } from '@/types'
import type { Configurator, IOmniSDK, InferOmniEdge, InferOmniNode, OmniGraph, OmniSDKFactory } from './types'
import type { OmniTransaction } from '@/transactions/types'
import { flattenTransactions } from '@/transactions/utils'
import { createModuleLogger } from '@layerzerolabs/io-devtools'
import { createDefaultApplicative } from '@/common/promise'

export type CreateTransactionsFromOmniNodes<TOmniGraph extends OmniGraph = OmniGraph, TOmniSDK = IOmniSDK> = Factory<
    [InferOmniNode<TOmniGraph>, TOmniSDK, TOmniGraph, OmniSDKFactory<TOmniSDK>],
    OmniTransaction[] | OmniTransaction | null | undefined
>

export type CreateTransactionsFromOmniEdges<TOmniGraph extends OmniGraph = OmniGraph, TOmniSDK = IOmniSDK> = Factory<
    [InferOmniEdge<TOmniGraph>, TOmniSDK, TOmniGraph, OmniSDKFactory<TOmniSDK>],
    OmniTransaction[] | OmniTransaction | null | undefined
>

/**
 * Function that takes care of the boilerplate for node configuration functions.
 *
 * It will create an SDK for every node in the graph, then call `createTransactions`
 * with the node itself, the created SDK, the whole graph and the SDK factory.
 *
 * ```
 * const configureSomething = createConfigureNodes(async ({ config }: OmniNode<{ something: string }>, sdk) => {
 *   const something = await sdk.getSomething()
 *   if (something !== config.something) return []
 *
 *   return sdk.setSomething(config.something)
 * })
 * ```
 *
 * @template TOmniGraph
 * @template TOmniSDK
 * @param {CreateTransactionsFromOmniNodes<TOmniGraph, TOmniSDK>} createTransactions
 * @returns {Configurator<TOmniGraph, TOmniSDK>}
 */
export const createConfigureNodes =
    <TOmniGraph extends OmniGraph = OmniGraph, TOmniSDK = IOmniSDK>(
        createTransactions: CreateTransactionsFromOmniNodes<TOmniGraph, TOmniSDK>
    ): Configurator<TOmniGraph, TOmniSDK> =>
    async (graph, createSdk) =>
        flattenTransactions(
            await Promise.all(
                graph.contracts.map(async (node) => {
                    const sdk = await createSdk(node.point)

                    return await createTransactions(node, sdk, graph, createSdk)
                })
            )
        )

/**
 * Function that takes care of the boilerplate for edge configuration functions.
 *
 * It will create an SDK for every edge (using the `from` field) in the graph, then call `createTransactions`
 * with the edge itself, the created SDK, the whole graph and the SDK factory.
 *
 * ```
 * const configureSomething = createConfigureEdges(async ({ config, vector: { to } }: OmniEdge<{ something: string }>, sdk) => {
 *   const something = await sdk.getSomethingFor(to.eid)
 *   if (something !== config.something) return []
 *
 *   return sdk.setSomething(to.eid, config.something)
 * })
 * ```
 *
 * @template TOmniGraph
 * @template TOmniSDK
 * @param {CreateTransactionsFromOmniEdges<TOmniGraph, TOmniSDK>} createTransactions
 * @returns {Configurator<TOmniGraph, TOmniSDK>}
 */
export const createConfigureEdges =
    <TOmniGraph extends OmniGraph = OmniGraph, TOmniSDK = IOmniSDK>(
        createTransactions: CreateTransactionsFromOmniEdges<TOmniGraph, TOmniSDK>
    ): Configurator<TOmniGraph, TOmniSDK> =>
    async (graph, createSdk) =>
        flattenTransactions(
            await Promise.all(
                graph.connections.map(async (edge) => {
                    const sdk = await createSdk(edge.vector.from)

                    return await createTransactions(edge, sdk, graph, createSdk)
                })
            )
        )

/**
 * Helper function that takes multiple configurators and executes them
 * (the execution is parallel or serial based on the LZ_ENABLE_EXPERIMENTAL_PARALLEL_EXECUTION
 * feature flag at the moment)
 *
 * ```
 * const configureOApp = createConfigureMultiple(
 *   configureOAppPeers
 *   configureSendLibraries
 *   configureReceiveLibraries
 *   configureReceiveLibraryTimeouts
 *   configureSendConfig
 *   configureReceiveConfig
 *   configureEnforcedOptions,
 *   configureCallerBpsCap,
 *   configureOAppDelegates
 * )
 * ```
 *
 * @param {...Configurator<TOmniGraph, TOmniSDK>} configurators An array of configuration functions
 * @returns {Configurator<TOmniGraph, TOmniSDK>}
 */
export const createConfigureMultiple =
    <TOmniGraph extends OmniGraph = OmniGraph, TOmniSDK = IOmniSDK>(
        ...configurators: Configurator<TOmniGraph, TOmniSDK>[]
    ): Configurator<TOmniGraph, TOmniSDK> =>
    async (graph, createSdk) => {
        const logger = createModuleLogger('configuration')
        const tasks = configurators.map((configurator) => () => configurator(graph, createSdk))

        // For now we keep the parallel execution as an opt-in feature flag
        // before we have a retry logic fully in place for the SDKs
        //
        // This is to avoid 429 too many requests errors from the RPCs
        const applicative = createDefaultApplicative(logger)

        return flattenTransactions(await applicative(tasks))
    }
