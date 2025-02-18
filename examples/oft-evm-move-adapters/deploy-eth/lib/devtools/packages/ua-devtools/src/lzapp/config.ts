import {
    flattenTransactions,
    formatOmniVector,
    type OmniTransaction,
    createConfigureMultiple,
} from '@layerzerolabs/devtools'
import { LzAppConfigurator } from './types'
import { createModuleLogger, printBoolean } from '@layerzerolabs/io-devtools'

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

export const configureLzApp: LzAppConfigurator = createConfigureMultiple(configureLzAppTrustedRemotes)
