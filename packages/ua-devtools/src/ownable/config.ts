import { createModuleLogger } from '@layerzerolabs/io-devtools'
import type { OwnableConfigurator } from './types'
import { flattenTransactions, formatOmniPoint } from '@layerzerolabs/devtools'

export const configureOwnable: OwnableConfigurator = async (graph, createSdk) => {
    const logger = createModuleLogger('Ownable')

    return flattenTransactions(
        await Promise.all(
            graph.contracts.map(async ({ point, config }) => {
                const formattedPoint = formatOmniPoint(point)

                if (config?.owner == null) {
                    return logger.verbose(`No owner specified for ${formattedPoint}`), undefined
                }

                logger.verbose(`Checking whether the owner of ${formattedPoint} is ${config.owner}`)

                const sdk = await createSdk(point)
                const hasOwner = await sdk.hasOwner(config.owner)
                if (hasOwner) {
                    return logger.verbose(`The owner of ${formattedPoint} already is ${config.owner}`), undefined
                }

                return (
                    logger.verbose(`Setting the owner of ${formattedPoint} to ${config.owner}`),
                    sdk.setOwner(config.owner)
                )
            })
        )
    )
}
