import { createModuleLogger, setDefaultLogLevel } from '@layerzerolabs/io-devtools'
import inquirer from 'inquirer'

import { getCoreSpotDeployment, getHyperEVMOAppDeployment, writeUpdatedCoreSpotDeployment } from '@/io/parser'
import { getHyperliquidWallet } from '@/signer'
import { requestEvmContract, finalizeEvmContract } from '@/operations'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function registerToken(args: any): Promise<void> {
    setDefaultLogLevel(args.logLevel)
    const logger = createModuleLogger('register-token', args.logLevel)
    logger.verbose(JSON.stringify(args, null, 2))

    const wallet = await getHyperliquidWallet(args.privateKey)

    const oappConfig = args.oappConfig
    const hyperAssetIndex = args.tokenIndex
    const network = args.network
    const isTestnet = network == 'testnet'

    logger.info(`Found public key ${wallet.address} from .env file`)
    const coreSpotDeployment = getCoreSpotDeployment(hyperAssetIndex, isTestnet, logger)
    const nativeSpot = coreSpotDeployment.coreSpot
    const txData = coreSpotDeployment.txData

    const { deployment } = await getHyperEVMOAppDeployment(oappConfig, network, logger)

    if (!deployment) {
        logger.error(`Deployment file not found for ${network}`)
        return
    }

    const oftAddress = deployment['address']

    logger.verbose(`txData: \n ${JSON.stringify(txData, null, 2)}`)

    const hyperAssetIndexInt = parseInt(hyperAssetIndex)

    const { executeTx } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'executeTx',
            message: `Found evm address for HyperCore-EVM ${oftAddress}. Do you want to execute the transaction?`,
            default: false,
        },
    ])

    if (!executeTx) {
        logger.info('Transaction cancelled - quitting.')
        process.exit(1)
    }

    logger.info(`Request EVM contract`)
    await requestEvmContract(wallet, isTestnet, oftAddress, txData.weiDiff, hyperAssetIndexInt, args.loglevel)

    logger.info(`Finalize EVM contract`)
    await finalizeEvmContract(wallet, isTestnet, hyperAssetIndexInt, txData.nonce, args.logLevel)

    writeUpdatedCoreSpotDeployment(hyperAssetIndex, isTestnet, nativeSpot.fullName ?? '', oftAddress, txData, logger)

    logger.info(`Token ${hyperAssetIndex} registered on ${network}`)
}
