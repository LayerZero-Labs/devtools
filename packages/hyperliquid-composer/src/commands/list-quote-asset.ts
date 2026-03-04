import { createModuleLogger, setDefaultLogLevel } from '@layerzerolabs/io-devtools'

import { isQuoteAsset as isQuoteAssetOperation } from '@/operations'
import { LOGGER_MODULES } from '@/types/cli-constants'
import { ListQuoteAssetArgs } from '@/types'

export async function listQuoteAsset(args: ListQuoteAssetArgs): Promise<void> {
    setDefaultLogLevel(args.logLevel)
    const logger = createModuleLogger(LOGGER_MODULES.LIST_QUOTE_ASSET, args.logLevel)

    const filterTokenIndex = args.filterTokenIndex ? parseInt(args.filterTokenIndex) : null
    const isTestnet = args.network === 'testnet'

    try {
        const result = await isQuoteAssetOperation(isTestnet, filterTokenIndex, args.logLevel)

        if (filterTokenIndex === null) {
            // Print all quote assets
            logger.info(`\nAll Quote Assets on ${args.network}:\n`)
            if (result.allQuoteAssets && result.allQuoteAssets.length > 0) {
                result.allQuoteAssets.forEach((asset) => {
                    logger.info(`  ${asset.name} (Index: ${asset.index})`)
                })
                logger.info(`\nTotal quote assets: ${result.allQuoteAssets.length}`)
            } else {
                logger.info('No quote assets found.')
            }
        } else {
            // Check specific token
            if (result.isQuoteAsset) {
                logger.verbose(`Token ${filterTokenIndex} (${result.tokenName}) is a quote asset`)
                logger.info('true\n')
            } else {
                logger.verbose(`Token ${filterTokenIndex} is not a quote asset`)
                logger.info('false\n')
            }
        }
    } catch (error) {
        logger.error(`Failed to check quote asset status: ${error}`)
        process.exit(1)
    }
}
