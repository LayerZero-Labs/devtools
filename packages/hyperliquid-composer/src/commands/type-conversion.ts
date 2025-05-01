import { createModuleLogger, setDefaultLogLevel } from '@layerzerolabs/io-devtools'

import { toAssetBridgeAddress } from '@/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function intoAssetBridgeAddress(args: any): Promise<void> {
    setDefaultLogLevel(args.logLevel)
    const logger = createModuleLogger('into-assetBridgeAddress', args.logLevel)

    const tokenIndex = args.tokenIndex
    const assetBridgeAddress = toAssetBridgeAddress(parseInt(tokenIndex))

    logger.info(`${assetBridgeAddress}`)
}
