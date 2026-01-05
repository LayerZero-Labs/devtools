import { createModuleLogger, setDefaultLogLevel } from '@layerzerolabs/io-devtools'
import inquirer from 'inquirer'

import { getCoreSpotDeployment, writeUpdatedCoreSpotDeployment } from '@/io/parser'
import { getHyperliquidSigner } from '@/signer'
import { setRequestEvmContract, setFinalizeEvmContract } from '@/operations'
import { LOGGER_MODULES } from '@/types/cli-constants'
import { RequestEvmContractArgs, FinalizeEvmContractArgs, FinalizeEvmContractCorewriterArgs } from '@/types'
import { RPC_URLS } from '@/types/constants'
import { ethers } from 'ethers'

const COREWRITER_ADDRESS = '0x3333333333333333333333333333333333333333'
const FINALIZE_EVM_CONTRACT_ACTION_TYPE_PREFIX = '0x01000008'
const ACTION_TYPE_FINALIZE = 1

export async function requestEvmContract(args: RequestEvmContractArgs): Promise<void> {
    setDefaultLogLevel(args.logLevel)
    const logger = createModuleLogger(LOGGER_MODULES.REGISTER_TOKEN, args.logLevel)
    logger.verbose(JSON.stringify(args, null, 2))

    const signer = await getHyperliquidSigner(args.privateKey)

    const hyperAssetIndex = args.tokenIndex
    const network = args.network
    const isTestnet = network == 'testnet'

    const signerAddress = await signer.getAddress()
    logger.info(`Found public key ${signerAddress} from .env file`)
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
    await setRequestEvmContract(signer, isTestnet, tokenAddress, txData.weiDiff, hyperAssetIndexInt, args.logLevel)
}

export async function finalizeEvmContract(args: FinalizeEvmContractArgs): Promise<void> {
    setDefaultLogLevel(args.logLevel)
    const logger = createModuleLogger(LOGGER_MODULES.REGISTER_TOKEN, args.logLevel)
    logger.verbose(JSON.stringify(args, null, 2))

    const signer = await getHyperliquidSigner(args.privateKey)

    const hyperAssetIndex = args.tokenIndex
    const network = args.network
    const isTestnet = network == 'testnet'

    const signerAddress = await signer.getAddress()
    logger.info(`Found public key ${signerAddress} from .env file`)
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
        await setFinalizeEvmContract(signer, isTestnet, hyperAssetIndexInt, txData.nonce, args.logLevel)
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

/**
 * Generates the calldata for finalizing an EVM contract link using the CoreWriter precompile
 * This allows users to send the transaction using Foundry's cast command
 */
export async function finalizeEvmContractCorewriter(args: FinalizeEvmContractCorewriterArgs): Promise<void> {
    setDefaultLogLevel(args.logLevel)
    const logger = createModuleLogger(LOGGER_MODULES.FINALIZE_EVM_CONTRACT_COREWRITER, args.logLevel)
    logger.verbose(JSON.stringify(args, null, 2))

    const tokenIndex = parseInt(args.tokenIndex)
    const nonce = parseInt(args.nonce)
    const network = args.network
    const isTestnet = network === 'testnet'

    // Step 1: Encode the action parameters (tokenIndex, actionType, nonce)
    const encodedParams = ethers.utils.defaultAbiCoder.encode(
        ['uint64', 'uint8', 'uint64'],
        [tokenIndex, ACTION_TYPE_FINALIZE, nonce]
    )

    // Step 2: Pack the action type prefix with the encoded parameters
    const packedData = ethers.utils.solidityPack(
        ['bytes', 'bytes'],
        [FINALIZE_EVM_CONTRACT_ACTION_TYPE_PREFIX, encodedParams]
    )

    // Step 3: Create the calldata for sendRawAction(bytes)
    const iface = new ethers.utils.Interface(['function sendRawAction(bytes)'])
    const calldata = iface.encodeFunctionData('sendRawAction', [packedData])

    const rpcUrl = isTestnet ? RPC_URLS.TESTNET : RPC_URLS.MAINNET

    // Print full usage instructions
    logger.info(`\n=== Finalize EVM Contract CoreWriter Calldata ===\n`)
    logger.info(`Token Index: ${tokenIndex}`)
    logger.info(`Nonce: ${nonce}`)
    logger.info(`Calldata:\n${calldata}\n`)
    logger.info(`Usage:\n`)
    logger.info(
        `cast send ${COREWRITER_ADDRESS} \\\n    ${calldata} \\\n    --rpc-url ${rpcUrl} \\\n    --private-key $EVM_TOKEN_DEPLOYER\n`
    )
}
