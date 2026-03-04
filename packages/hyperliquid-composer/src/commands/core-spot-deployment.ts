import { createModuleLogger, setDefaultLogLevel } from '@layerzerolabs/io-devtools'

import { getERC20abi, writeCoreSpotDeployment } from '@/io'
import { getSpotMeta, getHipTokenInfo, getSpotDeployState } from '@/operations'
import { toAssetBridgeAddress } from '@/types'
import type {
    CoreSpotDeployment,
    CoreSpotMetaData,
    SpotDeployStates,
    SpotInfo,
    TxData,
    UserGenesis,
    CoreSpotDeploymentArgs,
    TokenIndexArgs,
    SpotDeployStateArgs,
} from '@/types'
import { ethers } from 'ethers'
import { RPC_URLS } from '@/types'
import { LOGGER_MODULES } from '@/types/cli-constants'

import inquirer from 'inquirer'
import type { Logger } from '@layerzerolabs/io-devtools'

/**
 * Helper function to fetch spot metadata and token info with error handling
 * @param tokenIndex - The token index to fetch information for
 * @param isTestnet - Whether to use testnet or mainnet
 * @param logLevel - The log level to use
 * @param logger - Logger instance for error reporting
 * @returns Object containing coreSpot and coreSpotInfo, or exits on error
 */
async function fetchTokenMetadata(
    tokenIndex: string,
    isTestnet: boolean,
    logLevel: string,
    logger: Logger
): Promise<{ coreSpot: CoreSpotMetaData; coreSpotInfo: SpotInfo }> {
    let coreSpot: CoreSpotMetaData
    let coreSpotInfo: SpotInfo

    try {
        coreSpot = await getSpotMeta(null, isTestnet, logLevel, tokenIndex)
        coreSpotInfo = await getHipTokenInfo(null, isTestnet, logLevel, coreSpot.tokenId)
    } catch (error) {
        logger.error(
            `Failed to fetch token information for token ${tokenIndex}. The token's deployment may not have started.`
        )
        logger.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
        process.exit(1)
    }

    return { coreSpot, coreSpotInfo }
}

export async function coreSpotDeployment(args: CoreSpotDeploymentArgs): Promise<void> {
    setDefaultLogLevel(args.logLevel)
    const logger = createModuleLogger(LOGGER_MODULES.CORE_SPOT_DEPLOYMENT, args.logLevel)

    const network = args.network
    const tokenIndex = args.tokenIndex
    const action = args.action
    const isTestnet = args.network === 'testnet'

    const coreSpot: CoreSpotMetaData = await getSpotMeta(null, isTestnet, args.logLevel, tokenIndex)

    if (action === 'create') {
        const { tokenAddress, tokenTxHash } = await inquirer.prompt([
            {
                type: 'input',
                name: 'tokenAddress',
                message: 'Enter the token address',
            },
            {
                type: 'input',
                name: 'tokenTxHash',
                message: 'Enter the token tx hash',
            },
        ])

        let shouldQuit = false
        const token_txHash = ethers.utils.isHexString(tokenTxHash) ? tokenTxHash : ''
        if (!token_txHash) {
            logger.error('Invalid token tx hash')
            shouldQuit = true
        }

        const token_address = ethers.utils.isAddress(tokenAddress) ? tokenAddress : ''
        if (!token_address) {
            logger.error('Invalid token address')
            shouldQuit = true
        }

        if (shouldQuit) {
            logger.info('Quitting...')
            process.exit(1)
        }

        const token_abi = await getERC20abi()
        if (!token_abi) {
            logger.error(`ERC20 abi not found for ${network}`)
            return
        }

        const provider = new ethers.providers.JsonRpcProvider({
            url: RPC_URLS[network.toUpperCase()],
            skipFetchSetup: true,
        })

        const tx = await provider.getTransaction(token_txHash)
        const nonce = tx?.nonce
        const from = tx?.from
        logger.verbose(`Nonce: ${nonce}, From: ${from}`)

        const contract = new ethers.Contract(token_address, token_abi, provider)
        const tokenName = await contract.name()
        const decimals = await contract.decimals()
        logger.verbose(`Token name: ${tokenName}, Decimals: ${decimals}`)

        const weiDiff = decimals - coreSpot.weiDecimals
        logger.verbose(`Wei diff: ${weiDiff}`)

        const assetBridgeAddress = toAssetBridgeAddress(parseInt(tokenIndex))
        logger.verbose(`Asset bridge address: ${assetBridgeAddress}`)

        const txData: TxData = {
            txHash: token_txHash,
            nonce: nonce,
            from: from,
            weiDiff: weiDiff,
            assetBridgeAddress: assetBridgeAddress,
            connected: coreSpot.evmContract ? true : false,
        }

        logger.info('Populating userAndWei with the asset bridge address')

        const existingTokenAndWei: { token: number; wei: string }[] = []
        const msg =
            'Do you want to distribute some part of the genesis to the holders of an existing token (this is uncommon and optional)?'
        const { usingExistingTokenAndWei } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'usingExistingTokenAndWei',
                message: `${msg} (y/N)`,
            },
        ])

        if (usingExistingTokenAndWei === 'y') {
            existingTokenAndWei.push({
                token: 0,
                wei: '',
            })
        }

        const userGenesis: UserGenesis = {
            userAndWei: [
                {
                    address: assetBridgeAddress,
                    wei: '',
                },
            ],
            existingTokenAndWei: existingTokenAndWei,
            blacklistUsers: [],
        }

        const coreSpotDeployment: CoreSpotDeployment = {
            coreSpot,
            txData,
            userGenesis,
        }

        writeCoreSpotDeployment(tokenIndex, isTestnet, coreSpotDeployment, logger)
    } else if (action === 'get') {
        logger.info(JSON.stringify(coreSpot, null, 2))
    }
}

export async function hipTokenInfo(args: TokenIndexArgs): Promise<void> {
    setDefaultLogLevel(args.logLevel)
    const logger = createModuleLogger(LOGGER_MODULES.HIP_TOKEN_INFO, args.logLevel)

    const tokenIndex = args.tokenIndex
    const network = args.network
    const isTestnet = network === 'testnet'

    const { coreSpotInfo } = await fetchTokenMetadata(tokenIndex, isTestnet, args.logLevel, logger)

    logger.info(JSON.stringify(coreSpotInfo, null, 2))
}

export async function spotDeployState(args: SpotDeployStateArgs): Promise<void> {
    setDefaultLogLevel(args.logLevel)
    const logger = createModuleLogger(LOGGER_MODULES.GET_DEPLOY_STATE, args.logLevel)

    const tokenIndex = args.tokenIndex
    const network = args.network
    const isTestnet = network === 'testnet'

    let deployerAddress: string
    if (args.deployerAddress) {
        deployerAddress = args.deployerAddress
    } else {
        const { coreSpotInfo } = await fetchTokenMetadata(tokenIndex, isTestnet, args.logLevel, logger)
        deployerAddress = coreSpotInfo.deployer
        logger.info(
            `Using deployer address: ${deployerAddress} for token ${coreSpotInfo.name} with index ${tokenIndex}`
        )
    }

    let deployState: SpotDeployStates
    try {
        deployState = await getSpotDeployState(deployerAddress, isTestnet, args.logLevel)
    } catch (error) {
        logger.error(
            `Failed to fetch deployment state for token ${tokenIndex}. The token's deployment hasn't started yet.`
        )
        logger.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
        process.exit(1)
    }

    logger.verbose(`All deployment states for ${deployerAddress}: ${JSON.stringify(deployState, null, 2)}`)

    // iterate through deployState and print out the one with the same "token" as tokenIndex
    const state = deployState.states.find((state) => state.token === parseInt(tokenIndex))
    if (!state) {
        logger.error(
            `No in progress deployment state found for token ${tokenIndex}. This means that your token is deployed.`
        )
        process.exit(1)
    }
    logger.info(JSON.stringify(state, null, 2))
}
