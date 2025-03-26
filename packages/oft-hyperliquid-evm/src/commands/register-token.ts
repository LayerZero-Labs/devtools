import { createModuleLogger, setDefaultLogLevel } from '@layerzerolabs/io-devtools'

import { getCoreSpotDeployment, writeUpdatedCoreSpotDeployment } from '@/io/parser'
import { getHyperliquidWallet } from '@/signer'
import { requestEvmContract, finalizeEvmContract } from '@/operations'

import assert from 'assert'

export async function registerToken(args: any): Promise<void> {
    setDefaultLogLevel(args.logLevel)
    const logger = createModuleLogger('register-token', args.logLevel)

    const hyperAssetIndex = args.tokenIndex
    const network = args.network
    const wallet = await getHyperliquidWallet()
    const isTestnet = network == 'testnet'

    logger.info(`Found public key ${wallet.address} from .env file`)
    const coreSpotDeployment = getCoreSpotDeployment(hyperAssetIndex, isTestnet, logger)
    const nativeSpot = coreSpotDeployment.coreSpot
    const txData = coreSpotDeployment.txData

    assert(nativeSpot.evmContract, 'Native spot EVM contract is not set')

    logger.verbose(`txData: \n ${JSON.stringify(txData, null, 2)}`)

    const hyperAssetIndexInt = parseInt(hyperAssetIndex)

    logger.info(`Request EVM contract`)
    await requestEvmContract(
        wallet,
        isTestnet,
        nativeSpot.evmContract.address,
        txData.weiDiff,
        hyperAssetIndexInt,
        args.loglevel
    )

    logger.info(`Finalize EVM contract`)
    await finalizeEvmContract(wallet, isTestnet, hyperAssetIndexInt, txData.nonce, args.logLevel)

    writeUpdatedCoreSpotDeployment(
        hyperAssetIndex,
        isTestnet,
        nativeSpot.fullName ?? '',
        nativeSpot.evmContract.address,
        txData,
        logger
    )

    logger.info(`Token ${hyperAssetIndex} registered on ${network}`)
}
