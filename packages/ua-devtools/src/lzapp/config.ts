import { flattenTransactions, formatOmniVector, parallel, type OmniTransaction } from '@layerzerolabs/devtools'
import { LzAppFactory, LzAppOmniGraph } from './types'
import { createModuleLogger, printBoolean } from '@layerzerolabs/io-devtools'

export type LzAppConfigurator = (graph: LzAppOmniGraph, createSdk: LzAppFactory) => Promise<OmniTransaction[]>

export const configureLzApp: LzAppConfigurator = async (graph: LzAppOmniGraph, createSdk: LzAppFactory) =>
    flattenTransactions(
        // For now we keep the parallel execution as an opt-in feature flag
        // before we have a retry logic fully in place for the SDKs
        //
        // This is to avoid 429 too many requests errors from the RPCs
        process.env.LZ_ENABLE_EXPERIMENTAL_PARALLEL_EXECUTION
            ? (createModuleLogger('LzApp').warn(`You are using experimental parallel configuration`),
              await parallel([() => configureLzAppTrustedRemotes(graph, createSdk)]))
            : [await configureLzAppTrustedRemotes(graph, createSdk)]
    )

export const configureLzAppTrustedRemotes: LzAppConfigurator = async (graph, createSdk) => {
    const logger = createModuleLogger('LzApp')

    return flattenTransactions(
        await Promise.all(
            graph.connections.map(async ({ vector: { from, to } }): Promise<OmniTransaction[]> => {
                logger.verbose(`Checking connection ${formatOmniVector({ from, to })}`)

                const sdk = await createSdk(from)
                const hasPeer = await sdk.hasTrustedRemote(to.eid, to.address)

                logger.verbose(`Checked connection ${formatOmniVector({ from, to })}: ${printBoolean(hasPeer)}`)
                if (hasPeer) {
                    return []
                }

                logger.verbose(`Creating a connection ${formatOmniVector({ from, to })}`)
                return [await sdk.setTrustedRemote(to.eid, to.address)]
            })
        )
    )
}
