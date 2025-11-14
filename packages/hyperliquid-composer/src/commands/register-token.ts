import { createModuleLogger, setDefaultLogLevel } from '@layerzerolabs/io-devtools'
import inquirer from 'inquirer'

import { getCoreSpotDeployment, writeUpdatedCoreSpotDeployment } from '@/io/parser'
import { getHyperliquidWallet } from '@/signer'
import { setRequestEvmContract, setFinalizeEvmContract } from '@/operations'
import { LOGGER_MODULES } from '@/types/cli-constants'
import { RequestEvmContractArgs, FinalizeEvmContractArgs } from '@/types'
import { ethers } from 'ethers'

export async function requestEvmContract(args: RequestEvmContractArgs): Promise<void> {
    setDefaultLogLevel(args.logLevel)
    const logger = createModuleLogger(LOGGER_MODULES.REGISTER_TOKEN, args.logLevel)
    logger.verbose(JSON.stringify(args, null, 2))

    const wallet = await getHyperliquidWallet(args.privateKey)

    const hyperAssetIndex = args.tokenIndex
    const network = args.network
    const isTestnet = network == 'testnet'

    logger.info(`Found public key ${wallet.address} from .env file`)
    const coreSpotDeployment = getCoreSpotDeployment(hyperAssetIndex, isTestnet, logger)
    const txData = coreSpotDeployment.txData

    const { tokenAddress } = await inquirer.prompt([
        {
            type: 'input',
            name: 'tokenAddress',
            message: 'Enter the token address',
            validate: (input) => {
                if (!input.trim()) {
                    return 'Token address is required'
                }
                if (!ethers.utils.isAddress(input)) {
                    return 'Invalid Ethereum address format'
                }
                return true
            },
        },
    ])

    logger.verbose(`txData: \n ${JSON.stringify(txData, null, 2)}`)

    const hyperAssetIndexInt = parseInt(hyperAssetIndex)

    const { executeTx } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'executeTx',
            message: `Trying to populate a request to connect HyperCore-EVM ${hyperAssetIndex} to ${tokenAddress}. This should be sent by the Spot Deployer and before finalizeEvmContract is executed. Do you want to execute the transaction?`,
            default: false,
        },
    ])

    if (!executeTx) {
        logger.info('Transaction cancelled - quitting.')
        process.exit(1)
    }

    logger.info(`Request EVM contract`)
    await setRequestEvmContract(wallet, isTestnet, tokenAddress, txData.weiDiff, hyperAssetIndexInt, args.logLevel)
}

export async function finalizeEvmContract(args: FinalizeEvmContractArgs): Promise<void> {
    setDefaultLogLevel(args.logLevel)
    const logger = createModuleLogger(LOGGER_MODULES.REGISTER_TOKEN, args.logLevel)
    logger.verbose(JSON.stringify(args, null, 2))

    const wallet = await getHyperliquidWallet(args.privateKey)

    const hyperAssetIndex = args.tokenIndex
    const network = args.network
    const isTestnet = network == 'testnet'

    logger.info(`Found public key ${wallet.address} from .env file`)
    const coreSpotDeployment = getCoreSpotDeployment(hyperAssetIndex, isTestnet, logger)
    const nativeSpot = coreSpotDeployment.coreSpot
    const txData = coreSpotDeployment.txData

    const { tokenAddress } = await inquirer.prompt([
        {
            type: 'input',
            name: 'tokenAddress',
            message: 'Enter the token address',
            validate: (input) => {
                if (!input.trim()) {
                    return 'Token address is required'
                }
                if (!ethers.utils.isAddress(input)) {
                    return 'Invalid Ethereum address format'
                }
                return true
            },
        },
    ])

    logger.verbose(`txData: \n ${JSON.stringify(txData, null, 2)}`)

    const hyperAssetIndexInt = parseInt(hyperAssetIndex)

    const { executeTx } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'executeTx',
            message: `Confirms the connection of ${tokenAddress} to HyperCore-EVM ${hyperAssetIndex}. This should be sent by the EVM Deployer and after requestEvmContract is executed. Do you want to execute the transaction?`,
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
            message: `Confirm that you want to finalize the connection of ${tokenAddress} to HyperCore-EVM ${hyperAssetIndex}? This is irreversible.`,
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
            tokenAddress,
            txData,
            logger
        )
        logger.info(`Token ${hyperAssetIndex} registered on ${network}`)
    } catch (error) {
        process.exit(1)
    }
}
