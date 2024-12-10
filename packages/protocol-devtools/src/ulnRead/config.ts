import { createModuleLogger, createWithAsyncLogger, printBoolean } from '@layerzerolabs/io-devtools'
import {
    createConfigureMultiple,
    createConfigureNodes,
    formatOmniPoint,
    type OmniTransaction,
} from '@layerzerolabs/devtools'
import type { UlnReadConfigurator } from './types'

const createUlnReadLogger = () => createModuleLogger('UlnRead')
const withUlnReadLogger = createWithAsyncLogger(createUlnReadLogger)

export const configureUlnReadDefaultUlnConfigs: UlnReadConfigurator = withUlnReadLogger(
    createConfigureNodes(
        withUlnReadLogger(async ({ config, point }, sdk): Promise<OmniTransaction[]> => {
            const logger = createUlnReadLogger()
            const label = formatOmniPoint(point)

            const omniTransactions: OmniTransaction[] = []

            if (!config.defaultUlnConfigs) {
                logger.verbose(`defaultUln configuration not set for ${label}, skipping`)
                return []
            }

            for (const [channelId, ulnConfig] of config.defaultUlnConfigs) {
                logger.verbose(`Setting defaultUln configuration for ${label} on channel ${channelId}`)

                const transaction = await sdk.setDefaultUlnConfig(channelId, ulnConfig)
                omniTransactions.push(transaction)

                logger.verbose(`Set defaultUln configuration for ${label} on channel ${channelId}`)
            }

            return omniTransactions
        })
    )
)

export const configureUlnRead: UlnReadConfigurator = withUlnReadLogger(
    createConfigureMultiple(configureUlnReadDefaultUlnConfigs),
    {
        onStart: (logger) => logger.info(`Checking UlnRead configuration`),
        onSuccess: (logger) => logger.info(`${printBoolean(true)} Checked UlnRead configuration`),
        onError: (logger, args, error) => logger.error(`Failed to check UlnRead configuration: ${error}`),
    }
)
