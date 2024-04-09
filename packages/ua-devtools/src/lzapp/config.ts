import {
    flattenTransactions,
    formatOmniVector,
    parallel,
    type OmniTransaction,
    sequence,
} from '@layerzerolabs/devtools'
import { LzAppConfigurator } from './types'
import { createModuleLogger, printBoolean } from '@layerzerolabs/io-devtools'

export const configureLzApp: LzAppConfigurator = async (graph, createSdk) => {
    const logger = createModuleLogger('LzApp')
    const tasks = [() => configureLzAppTrustedRemotes(graph, createSdk)]
    // For now we keep the parallel execution as an opt-in feature flag
    // before we have a retry logic fully in place for the SDKs
    //
    // This is to avoid 429 too many requests errors from the RPCs
    const applicative = process.env.LZ_ENABLE_EXPERIMENTAL_PARALLEL_EXECUTION
        ? (logger.warn(`You are using experimental parallel configuration`), parallel)
        : sequence

    return flattenTransactions(await applicative(tasks))
}

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
