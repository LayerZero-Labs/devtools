import { flattenTransactions, type OmniTransaction } from '@layerzerolabs/devtools'
import type { UlnReadConfigurator } from './types'

export const configureUlnRead: UlnReadConfigurator = async (graph, createSdk) =>
    flattenTransactions([...(await configureUlnReadDefaultUlnConfigs(graph, createSdk))])

export const configureUlnReadDefaultUlnConfigs: UlnReadConfigurator = async (graph, createSdk) =>
    flattenTransactions(
        await Promise.all(
            graph.contracts.map(async ({ point, config }): Promise<OmniTransaction[]> => {
                const sdk = await createSdk(point)

                return Promise.all(
                    config.defaultUlnConfigs.map(([channelId, config]) => sdk.setDefaultUlnConfig(channelId, config))
                )
            })
        )
    )
