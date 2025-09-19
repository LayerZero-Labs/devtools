import { createModuleLogger, setDefaultLogLevel } from '@layerzerolabs/io-devtools'

import { toAssetBridgeAddress } from '@/types'
import { LOGGER_MODULES } from '@/types/cli-constants'
import { TokenIndexArgs } from '@/types'

export async function intoAssetBridgeAddress(args: TokenIndexArgs): Promise<void> {
    setDefaultLogLevel(args.logLevel)
    const logger = createModuleLogger(LOGGER_MODULES.INTO_ASSET_BRIDGE_ADDRESS, args.logLevel)

    const tokenIndex = args.tokenIndex
    const assetBridgeAddress = toAssetBridgeAddress(parseInt(tokenIndex))

    logger.info(`${assetBridgeAddress}`)
}
