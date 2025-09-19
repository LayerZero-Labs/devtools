import { createModuleLogger, setDefaultLogLevel } from '@layerzerolabs/io-devtools'

import { getSpotPairsWithMetadata } from '@/operations'
import { formatSpotPairsTable } from '@/io/cli-output-formatter'
import { LOGGER_MODULES } from '@/types/cli-constants'
import { TokenIndexArgs } from '@/types'

export async function listSpotPairs(args: TokenIndexArgs): Promise<void> {
    setDefaultLogLevel(args.logLevel)
    const logger = createModuleLogger(LOGGER_MODULES.LIST_SPOT_PAIRS, args.logLevel)

    const tokenIndex = parseInt(args.tokenIndex)
    const isTestnet = args.network === 'testnet'

    logger.info(`Listing spot trading pairs for token index ${tokenIndex}`)

    try {
        const data = await getSpotPairsWithMetadata(isTestnet, tokenIndex, args.logLevel)

        const formattedOutput = formatSpotPairsTable(data, tokenIndex)
        logger.info(formattedOutput)
    } catch (error) {
        logger.error(`Failed to list spot pairs: ${error}`)
        process.exit(1)
    }
}
