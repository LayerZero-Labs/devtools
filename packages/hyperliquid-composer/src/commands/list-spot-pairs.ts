import { createModuleLogger, setDefaultLogLevel } from '@layerzerolabs/io-devtools'

import { getSpotPairs } from '@/operations'
import { LOGGER_MODULES } from '@/types/cli-constants'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function listSpotPairs(args: any): Promise<void> {
    setDefaultLogLevel(args.logLevel)
    const logger = createModuleLogger(LOGGER_MODULES.LIST_SPOT_PAIRS, args.logLevel)

    const tokenIndex = parseInt(args.tokenIndex)
    const isTestnet = args.network === 'testnet'

    logger.info(`Listing spot trading pairs for token index ${tokenIndex}`)

    try {
        const pairs = await getSpotPairs(isTestnet, tokenIndex, args.logLevel)

        console.log(`\nSpot trading pairs for token index ${tokenIndex}:`)
        console.log('='.repeat(50))

        if (pairs.length === 0) {
            console.log('No trading pairs found for this token.')
            return
        }

        pairs.forEach((pair) => {
            console.log(`Pair: ${pair.name}`)
            console.log(`Tokens: [${pair.tokens.join(', ')}]`)
            console.log(`Index: ${pair.index}`)
            console.log(`Canonical: ${pair.isCanonical}`)
            console.log('-'.repeat(30))
        })

        console.log(`\nTotal pairs found: ${pairs.length}`)
    } catch (error) {
        logger.error(`Failed to list spot pairs: ${error}`)
        process.exit(1)
    }
}
