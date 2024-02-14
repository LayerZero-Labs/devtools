import { flattenTransactions, formatOmniVector, type OmniTransaction } from '@layerzerolabs/devtools'
import { LzAppFactory, LzAppOmniGraph } from './types'
import { createModuleLogger, printBoolean } from '@layerzerolabs/io-devtools'

export type LzAppConfigurator = (graph: LzAppOmniGraph, createSdk: LzAppFactory) => Promise<OmniTransaction[]>

export const configureLzApp: LzAppConfigurator = async (graph: LzAppOmniGraph, createSdk: LzAppFactory) =>
    flattenTransactions([await configureLzAppTrustedRemotes(graph, createSdk)])

export const configureLzAppTrustedRemotes: LzAppConfigurator = async (graph, createSdk) => {
    const logger = createModuleLogger('LzApp')

    return flattenTransactions(
        await Promise.all(
            graph.connections.map(async ({ vector: { from, to } }): Promise<OmniTransaction[]> => {
                logger.verbose(`Checking connection ${formatOmniVector({ from, to })}`)

                const sdk = await createSdk(from)
                const hasPeer = await sdk.hasTrustedRemote(to.eid, to.address)

                logger.verbose(`Checked connection ${formatOmniVector({ from, to })}: ${printBoolean(hasPeer)}`)
                if (hasPeer) return []

                logger.verbose(`Creating a connection ${formatOmniVector({ from, to })}`)
                return [await sdk.setTrustedRemote(to.eid, to.address)]
            })
        )
    )
}
