import { createModuleLogger, setDefaultLogLevel } from '@layerzerolabs/io-devtools'

import { getHyperliquidSigner } from '@/signer'
import { useBigBlock, useSmallBlock } from '@/operations'
import { LOGGER_MODULES } from '@/types/cli-constants'
import { SetBlockArgs } from '@/types'

export async function setBlock(args: SetBlockArgs): Promise<void> {
    setDefaultLogLevel(args.logLevel)
    const logger = createModuleLogger(LOGGER_MODULES.SET_BLOCK, args.logLevel)

    const signer = await getHyperliquidSigner(args.privateKey)
    const isTestnet = args.network === 'testnet'
    const blockSize = args.size
    const skipPrompt = args.ci || false

    logger.info(`Switching to hyperliquid ${blockSize} block`)

    if (blockSize === 'big') {
        logger.info(`Note: Sending transactions using big block mines at a transaction per minute.`)
        await useBigBlock(signer, isTestnet, args.logLevel, skipPrompt)
    } else {
        await useSmallBlock(signer, isTestnet, args.logLevel, skipPrompt)
    }
}
