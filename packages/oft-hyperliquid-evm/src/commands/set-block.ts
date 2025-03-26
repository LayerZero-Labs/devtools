import { createModuleLogger, setDefaultLogLevel } from '@layerzerolabs/io-devtools'

import { getHyperliquidWallet } from '@/signer'
import { useBigBlock, useSmallBlock } from '@/operations'

export async function setBlock(args: any): Promise<void> {
    setDefaultLogLevel(args.logLevel)
    const logger = createModuleLogger('set-block', args.logLevel)

    const wallet = await getHyperliquidWallet()
    const isTestnet = args.network === 'testnet'
    const blockSize = args.size

    logger.info(`Switching to hyperliquid ${blockSize} block`)

    if (blockSize === 'big') {
        logger.info(`Note: Sending transactions using big block mines at a transaction per minute.`)
        await useBigBlock(wallet, isTestnet, args.logLevel)
    } else {
        await useSmallBlock(wallet, isTestnet, args.logLevel)
    }
}
