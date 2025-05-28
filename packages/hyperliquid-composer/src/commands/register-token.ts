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

    let oft_address: string
    try {
        const { deployment } = await getHyperEVMOAppDeployment(oappConfig, network, logger)

        if (!deployment) {
            logger.error(`Deployment file not found for ${network}`)
            return
        }
        oft_address = deployment['address']
    } catch (error) {
        logger.error(
            `Error fetching deployment for ${network} for oapp-config ${oappConfig}. \n\n Can you please provide the oft address manually?`
        )
        const { oftAddress } = await inquirer.prompt([
            {
                type: 'input',
                name: 'oftAddress',
                message: 'Enter the oft address',
            },
        ])
        oft_address = oftAddress
    }

    logger.verbose(`txData: \n ${JSON.stringify(txData, null, 2)}`)

    const hyperAssetIndexInt = parseInt(hyperAssetIndex)

    const { executeTx } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'executeTx',
            message: `Trying to populate a request to connect HyperCore-EVM ${hyperAssetIndex} to ${oft_address}. This should be sent by the Spot Deployer and before finalizeEvmContract is executed. Do you want to execute the transaction?`,
            default: false,
        },
    ])

    if (!executeTx) {
        logger.info('Transaction cancelled - quitting.')
        process.exit(1)
    }

    logger.info(`Request EVM contract`)
    await setRequestEvmContract(wallet, isTestnet, oft_address, txData.weiDiff, hyperAssetIndexInt, args.logLevel)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    let oft_address: string

    try {
        const { deployment } = await getHyperEVMOAppDeployment(oappConfig, network, logger)

        if (!deployment) {
            logger.error(`Deployment file not found for ${network}`)
            return
        }

        oft_address = deployment['address']
    } catch (error) {
        logger.error(
            `Error fetching deployment for ${network} for oapp-config ${oappConfig}. \n\n Can you please provide the oft address manually?`
        )
        const { oftAddress } = await inquirer.prompt([
            {
                type: 'input',
                name: 'oftAddress',
                message: 'Enter the oft address',
            },
        ])
        oft_address = oftAddress
    }

    logger.verbose(`txData: \n ${JSON.stringify(txData, null, 2)}`)

    const hyperAssetIndexInt = parseInt(hyperAssetIndex)

    const { executeTx } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'executeTx',
            message: `Confirms the connection of ${oft_address} to HyperCore-EVM ${hyperAssetIndex}. This should be sent by the EVM Deployer and after requestEvmContract is executed. Do you want to execute the transaction?`,
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
            message: `Confirm that you want to finalize the connection of ${oft_address} to HyperCore-EVM ${hyperAssetIndex}? This is irreversible.`,
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
            oft_address,
            txData,
            logger
        )
        logger.info(`Token ${hyperAssetIndex} registered on ${network}`)
    } catch (error) {
        process.exit(1)
    }
}
