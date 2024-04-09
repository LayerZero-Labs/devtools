import { flattenTransactions, isDeepEqual, type OmniTransaction } from '@layerzerolabs/devtools'
import type { ExecutorConfigurator } from './types'

export const configureExecutor: ExecutorConfigurator = async (graph, createSdk) =>
    flattenTransactions([await configureExecutorDstConfig(graph, createSdk)])

export const configureExecutorDstConfig: ExecutorConfigurator = async (graph, createSdk) =>
    flattenTransactions(
        await Promise.all(
            graph.connections.map(async ({ vector: { from, to }, config }): Promise<OmniTransaction[]> => {
                const sdk = await createSdk(from)
                const dstConfig = await sdk.getDstConfig(to.eid)

                // TODO Normalize the config values using a schema before comparing them
                if (isDeepEqual(dstConfig, config.dstConfig)) {
                    return []
                }

                return [await sdk.setDstConfig(to.eid, config.dstConfig)]
            })
        )
    )
