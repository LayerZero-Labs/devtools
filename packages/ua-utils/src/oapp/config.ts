import type { OmniTransaction } from '@layerzerolabs/utils'
import type { OAppFactory, OAppOmniGraph } from './types'
import { createModuleLogger, printBoolean } from '@layerzerolabs/io-utils'
import { formatOmniVector } from '@layerzerolabs/utils'

export const configureOApp = async (graph: OAppOmniGraph, createSdk: OAppFactory): Promise<OmniTransaction[]> => {
    const logger = createModuleLogger('OApp')

    const setPeers = await Promise.all(
        graph.connections.map(async ({ vector: { from, to } }): Promise<OmniTransaction[]> => {
            logger.verbose(`Checking connection ${formatOmniVector({ from, to })}`)

            const sdk = await createSdk(from)
            const hasPeer = await sdk.hasPeer(to.eid, to.address)

            logger.verbose(`Checked connection ${formatOmniVector({ from, to })}: ${printBoolean(hasPeer)}`)
            if (hasPeer) return []

            logger.verbose(`Creating a connection ${formatOmniVector({ from, to })}`)
            return [await sdk.setPeer(to.eid, to.address)]
        })
    )

    return [...setPeers].flat()
}
