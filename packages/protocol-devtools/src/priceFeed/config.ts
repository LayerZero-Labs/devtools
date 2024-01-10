import { flattenTransactions, isDeepEqual, type OmniTransaction } from '@layerzerolabs/devtools'
import type { PriceFeedFactory, PriceFeedOmniGraph } from './types'

export type PriceFeedConfigurator = (
    graph: PriceFeedOmniGraph,
    createSdk: PriceFeedFactory
) => Promise<OmniTransaction[]>

export const configurePriceFeed: PriceFeedConfigurator = async (graph, createSdk) =>
    flattenTransactions([await configurePriceFeedPriceData(graph, createSdk)])

export const configurePriceFeedPriceData: PriceFeedConfigurator = async (graph, createSdk) =>
    flattenTransactions(
        await Promise.all(
            graph.connections.map(async ({ vector: { from, to }, config }): Promise<OmniTransaction[]> => {
                const sdk = await createSdk(from)
                const priceData = await sdk.getPrice(to.eid)

                // TODO Normalize the config values using a schema before comparing them
                if (isDeepEqual(priceData, config.priceData)) return []

                return [await sdk.setPrice(to.eid, config.priceData)]
            })
        )
    )
