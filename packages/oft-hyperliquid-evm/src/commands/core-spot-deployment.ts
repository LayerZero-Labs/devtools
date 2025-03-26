import { createModuleLogger, setDefaultLogLevel } from '@layerzerolabs/io-devtools'

import { getHyperliquidWallet } from '@/signer'
import { writeCoreSpotDeployment } from '@/io'
import { getSpotMeta, createCoreSpotDeployment } from '@/operations'
import type { CoreSpotDeployment, CoreSpotMetaData } from '@/types'

export async function coreSpotDeployment(args: any): Promise<void> {
    setDefaultLogLevel(args.logLevel)
    const logger = createModuleLogger('core-spot-deployment', args.logLevel)

    const wallet = await getHyperliquidWallet()
    const isTestnet = args.network === 'testnet'

    const tokenIndex = args.tokenIndex
    const action = args.action

    if (action === 'create') {
        const coreSpotDeployment: CoreSpotDeployment = await createCoreSpotDeployment(
            wallet,
            isTestnet,
            args.logLevel,
            tokenIndex
        )
        writeCoreSpotDeployment(tokenIndex, isTestnet, coreSpotDeployment, logger)
    } else if (action === 'get') {
        const spotMeta: CoreSpotMetaData = await getSpotMeta(wallet, isTestnet, args.logLevel, tokenIndex)
        logger.info(JSON.stringify(spotMeta, null, 2))
    }
}
