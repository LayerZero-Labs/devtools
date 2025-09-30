import { createModuleLogger, setDefaultLogLevel } from '@layerzerolabs/io-devtools'
import inquirer from 'inquirer'

import { getCoreSpotDeployment, getHyperEVMOAppDeployment, writeUpdatedCoreSpotDeployment } from '@/io/parser'
import { getHyperliquidWallet } from '@/signer'
import { setRequestEvmContract, setFinalizeEvmContract } from '@/operations'
import { LOGGER_MODULES } from '@/types/cli-constants'
import { RequestEvmContractArgs, FinalizeEvmContractArgs } from '@/types'

export async function requestEvmContract(args: RequestEvmContractArgs): Promise<void> {
    setDefaultLogLevel(args.logLevel)
    const logger = createModuleLogger(LOGGER_MODULES.REGISTER_TOKEN, args.logLevel)
    logger.verbose(JSON.stringify(args, null, 2))

    const wallet = await getHyperliquidWallet(args.privateKey)

    const oappConfig = args.oappConfig
    const hyperAssetIndex = args.tokenIndex
    const network = args.network
    const isTestnet = network == 'testnet'

    logger.info(`Found public key ${wallet.address} from .env file`)
    const coreSpotDeployment = getCoreSpotDeployment(hyperAssetIndex, isTestnet, logger)
    const txData = coreSpotDeployment.txData

    let token_address: string
    try {
        const { deployment } = await getHyperEVMOAppDeployment(oappConfig!, network, logger)

        if (!deployment) {
            logger.error(`Deployment file not found for ${network}`)
            return
        }
        token_address = deployment['address']
    } catch (error) {
        logger.error(
            `Error fetching deployment for ${network} for oapp-config ${oappConfig}. \n\n Can you please provide the token address manually?`
        )
        const { tokenAddress } = await inquirer.prompt([
            {
                type: 'input',
                name: 'tokenAddress',
                message: 'Enter the token address',
            },
        ])
        token_address = tokenAddress
    }

    logger.verbose(`txData: \n ${JSON.stringify(txData, null, 2)}`)

    const hyperAssetIndexInt = parseInt(hyperAssetIndex)

    const { executeTx } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'executeTx',
            message: `Trying to populate a request to connect HyperCore-EVM ${hyperAssetIndex} to ${token_address}. This should be sent by the Spot Deployer and before finalizeEvmContract is executed. Do you want to execute the transaction?`,
            default: false,
        },
    ])

    if (!executeTx) {
        logger.info('Transaction cancelled - quitting.')
        process.exit(1)
    }

    logger.info(`Request EVM contract`)
    await setRequestEvmContract(wallet, isTestnet, token_address, txData.weiDiff, hyperAssetIndexInt, args.logLevel)
}

export async function finalizeEvmContract(args: FinalizeEvmContractArgs): Promise<void> {
    setDefaultLogLevel(args.logLevel)
    const logger = createModuleLogger(LOGGER_MODULES.REGISTER_TOKEN, args.logLevel)
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

    let token_address: string

    try {
        const { deployment } = await getHyperEVMOAppDeployment(oappConfig!, network, logger)

        if (!deployment) {
            logger.error(`Deployment file not found for ${network}`)
            return
        }

        token_address = deployment['address']
    } catch (error) {
        logger.error(
            `Error fetching deployment for ${network} for oapp-config ${oappConfig}. \n\n Can you please provide the token address manually?`
        )
        const { tokenAddress } = await inquirer.prompt([
            {
                type: 'input',
                name: 'tokenAddress',
                message: 'Enter the token address',
            },
        ])
        token_address = tokenAddress
    }

    logger.verbose(`txData: \n ${JSON.stringify(txData, null, 2)}`)

    const hyperAssetIndexInt = parseInt(hyperAssetIndex)

    const { executeTx } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'executeTx',
            message: `Confirms the connection of ${token_address} to HyperCore-EVM ${hyperAssetIndex}. This should be sent by the EVM Deployer and after requestEvmContract is executed. Do you want to execute the transaction?`,
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
            message: `Confirm that you want to finalize the connection of ${token_address} to HyperCore-EVM ${hyperAssetIndex}? This is irreversible.`,
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
            token_address,
            txData,
            logger
        )
        logger.info(`Token ${hyperAssetIndex} registered on ${network}`)
    } catch (error) {
        process.exit(1)
    }
}
