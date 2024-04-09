import { flattenTransactions, type OmniTransaction } from '@layerzerolabs/devtools'
import type { Uln302Configurator } from './types'

export const configureUln302: Uln302Configurator = async (graph, createSdk) =>
    flattenTransactions([
        ...(await configureUln302DefaultExecutorConfigs(graph, createSdk)),
        ...(await configureUln302DefaultUlnConfigs(graph, createSdk)),
    ])

export const configureUln302DefaultExecutorConfigs: Uln302Configurator = async (graph, createSdk) =>
    flattenTransactions(
        await Promise.all(
            graph.contracts.map(async ({ point, config }): Promise<OmniTransaction[]> => {
                const sdk = await createSdk(point)

                return Promise.all(
                    config.defaultExecutorConfigs.map(([eid, config]) => sdk.setDefaultExecutorConfig(eid, config))
                )
            })
        )
    )

export const configureUln302DefaultUlnConfigs: Uln302Configurator = async (graph, createSdk) =>
    flattenTransactions(
        await Promise.all(
            graph.contracts.map(async ({ point, config }): Promise<OmniTransaction[]> => {
                const sdk = await createSdk(point)

                return Promise.all(
                    config.defaultUlnConfigs.map(([eid, config]) => sdk.setDefaultUlnConfig(eid, config))
                )
            })
        )
    )
