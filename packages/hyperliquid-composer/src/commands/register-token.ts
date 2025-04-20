import { createModuleLogger, setDefaultLogLevel } from '@layerzerolabs/io-devtools'
import inquirer from 'inquirer'

import { getCoreSpotDeployment, getHyperEVMOAppDeployment, writeUpdatedCoreSpotDeployment } from '@/io/parser'
import { getHyperliquidWallet } from '@/signer'
import { setRequestEvmContract, setFinalizeEvmContract } from '@/operations'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function requestEvmContract(args: any): Promise<void> {
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
            message: `Trying to populate a request to connect HyperCore-EVM ${hyperAssetIndex} to ${oftAddress}. This should be sent by the Spot Deployer and before finalizeEvmContract is executed. Do you want to execute the transaction?`,
            default: false,
        },
    ])

    if (!executeTx) {
        logger.info('Transaction cancelled - quitting.')
        process.exit(1)
    }

    logger.info(`Request EVM contract`)
    await setRequestEvmContract(wallet, isTestnet, oftAddress, txData.weiDiff, hyperAssetIndexInt, args.logLevel)
}

export async function finalizeEvmContract(args: any): Promise<void> {
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
            message: `Confirms the connection of ${oftAddress} to HyperCore-EVM ${hyperAssetIndex}. This should be sent by the EVM Deployer and after requestEvmContract is executed. Do you want to execute the transaction?`,
            default: false,
        },
    ])

    if (!executeTx) {
        logger.info('Transaction cancelled - quitting.')
        process.exit(1)
    }

    const { confirmTx } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirmTx',
            message: `Confirm that you want to finalize the connection of ${oftAddress} to HyperCore-EVM ${hyperAssetIndex}? This is irreversible.`,
            default: false,
        },
    ])

    if (!confirmTx) {
        logger.info('Transaction cancelled - quitting.')
        process.exit(1)
    }

    logger.info(`Finalize EVM contract`)
    try {
        await setFinalizeEvmContract(wallet, isTestnet, hyperAssetIndexInt, txData.nonce, args.logLevel)
        writeUpdatedCoreSpotDeployment(
            hyperAssetIndex,
            isTestnet,
            nativeSpot.fullName ?? '',
            oftAddress,
            txData,
            logger
        )
        logger.info(`Token ${hyperAssetIndex} registered on ${network}`)
    } catch (error) {
        process.exit(1)
    }
}
