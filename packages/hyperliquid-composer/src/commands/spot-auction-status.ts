import { createModuleLogger, setDefaultLogLevel } from '@layerzerolabs/io-devtools'

import { getSpotPairDeployAuctionStatus } from '@/operations'
import { LOGGER_MODULES } from '@/types/cli-constants'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function spotAuctionStatus(args: any): Promise<void> {
    setDefaultLogLevel(args.logLevel)
    const logger = createModuleLogger(LOGGER_MODULES.SPOT_AUCTION_STATUS, args.logLevel)

    const isTestnet = args.network === 'testnet'

    logger.verbose(`Fetching spot pair deploy auction status for ${isTestnet ? 'testnet' : 'mainnet'}`)

    try {
        const auctionStatus = await getSpotPairDeployAuctionStatus(isTestnet, args.logLevel)

        logger.info(`Spot Pair Deploy Auction Status:`)
        logger.info('='.repeat(50))

        const startDate = new Date(auctionStatus.startTimeSeconds * 1000)
        const endDate = new Date((auctionStatus.startTimeSeconds + auctionStatus.durationSeconds) * 1000)
        const now = new Date()
        const isActive = now >= startDate && now <= endDate

        logger.info(`Start Time: ${startDate.toISOString()}`)
        logger.info(`End Time: ${endDate.toISOString()}`)
        logger.info(
            `Duration: ${auctionStatus.durationSeconds} seconds (${Math.round(auctionStatus.durationSeconds / 3600)} hours)`
        )
        logger.info(`Status: ${isActive ? 'Active' : 'Inactive'}`)
        logger.info(`Start Gas: ${auctionStatus.startGas} HYPE`)
        logger.info(`Current Gas: ${auctionStatus.currentGas} HYPE`)
        logger.info(`End Gas: ${auctionStatus.endGas || 'Not set'}`)

        if (isActive) {
            const timeLeft = endDate.getTime() - now.getTime()
            const hoursLeft = Math.round(timeLeft / (1000 * 60 * 60))
            logger.info(`Time Remaining: ~${hoursLeft} hours`)
        }
        logger.info('='.repeat(50))
    } catch (error) {
        logger.error(`Failed to fetch spot auction status: ${error}`)
        process.exit(1)
    }
}
