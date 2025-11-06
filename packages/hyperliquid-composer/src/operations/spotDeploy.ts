import { createModuleLogger } from '@layerzerolabs/io-devtools'
import { Wallet } from 'ethers'
import inquirer from 'inquirer'

import {
    getCoreSpotDeployment,
    updateFreezePrivilegeStatus,
    updateQuoteTokenStatus,
    updateUserFreezeStatus,
} from '../io'
import { HyperliquidClient } from '../signer'
import { MAX_HYPERCORE_SUPPLY, QUOTE_TOKENS } from '../types'
import { getSpotDeployState, getExistingQuoteTokens, getSpotPairDeployAuctionStatus } from './spotMeta'
import type { SpotDeployAction, SpotDeployStates } from '../types'
import { RegisterHyperliquidity } from '@/types/spotDeploy'
import { LOGGER_MODULES } from '@/types/cli-constants'

export async function setTradingFeeShare(
    wallet: Wallet,
    isTestnet: boolean,
    coreSpotTokenId: number,
    share: string,
    logLevel: string
) {
    const action: SpotDeployAction['action'] = {
        type: 'spotDeploy',
        setDeployerTradingFeeShare: {
            token: coreSpotTokenId,
            share: share,
        },
    }

    const hyperliquidClient = new HyperliquidClient(isTestnet, logLevel)
    const response = await hyperliquidClient.submitHyperliquidAction('/exchange', wallet, action)
    return response
}

export async function setUserGenesis(
    wallet: Wallet,
    isTestnet: boolean,
    coreSpotTokenId: number,
    action: string,
    logLevel: string
) {
    const logger = createModuleLogger(LOGGER_MODULES.SET_USER_GENESIS, logLevel)
    const coreSpotDeployment = getCoreSpotDeployment(coreSpotTokenId, isTestnet, logger)

    const userGenesis = coreSpotDeployment.userGenesis

    let userAndWei: Array<[string, string]> = []
    let existingTokenAndWei: Array<[number, string]> = []
    let blacklistUsers: Array<[string, boolean]> = []

    switch (action) {
        case 'userAndWei':
            userAndWei = userGenesis.userAndWei.map((user) => [user.address.toLowerCase(), user.wei])
            break
        case 'existingTokenAndWei':
            existingTokenAndWei = userGenesis.existingTokenAndWei.map((token) => [token.token, token.wei])
            break
        case 'blacklistUsers':
            blacklistUsers = userGenesis.blacklistUsers.map((user) => [user, true])
            break
        default:
            userAndWei = userGenesis.userAndWei.map((user) => [user.address.toLowerCase(), user.wei])
            existingTokenAndWei = userGenesis.existingTokenAndWei.map((token) => [token.token, token.wei])
            blacklistUsers = userGenesis.blacklistUsers.map((user) => [user, true])
    }

    let responseForUserGenesis = {}
    let responseForBlacklistUsers = {}

    const hyperliquidClient = new HyperliquidClient(isTestnet, logLevel)

    if (userAndWei.length > 0 || existingTokenAndWei.length > 0) {
        const totalUserWei = userAndWei.reduce((acc, [_, wei]) => acc + BigInt(wei), BigInt(0))
        const totalExistingTokenWei = existingTokenAndWei.reduce((acc, [_, wei]) => acc + BigInt(wei), BigInt(0))

        logger.verbose(
            `Total user and existing token wei: ${totalUserWei + totalExistingTokenWei} (u64.max-1: ${MAX_HYPERCORE_SUPPLY})`
        )

        if (totalUserWei + totalExistingTokenWei > MAX_HYPERCORE_SUPPLY) {
            logger.error(
                `Total user and existing token wei exceeds the maximum hypercore supply: ${totalUserWei + totalExistingTokenWei} > ${MAX_HYPERCORE_SUPPLY} (u64.max-1)`
            )
            process.exit(1)
        }

        const actionForUserGenesis: SpotDeployAction['action'] = {
            type: 'spotDeploy',
            userGenesis: {
                token: coreSpotTokenId,
                userAndWei: userAndWei,
                existingTokenAndWei: existingTokenAndWei,
            },
        }

        logger.info('Setting userAndWei and existingTokenAndWei')
        responseForUserGenesis = await hyperliquidClient.submitHyperliquidAction(
            '/exchange',
            wallet,
            actionForUserGenesis
        )
    }

    if (blacklistUsers.length > 0) {
        const actionForBlacklistUsers: SpotDeployAction['action'] = {
            type: 'spotDeploy',
            userGenesis: {
                token: coreSpotTokenId,
                userAndWei: [],
                existingTokenAndWei: [],
                blacklistUsers: blacklistUsers,
            },
        }

        logger.info('Setting blacklistUsers')
        responseForBlacklistUsers = await hyperliquidClient.submitHyperliquidAction(
            '/exchange',
            wallet,
            actionForBlacklistUsers
        )
    }

    return { responseForUserGenesis, responseForBlacklistUsers }
}

export async function setGenesis(wallet: Wallet, isTestnet: boolean, coreSpotTokenId: number, logLevel: string) {
    const logger = createModuleLogger(LOGGER_MODULES.SET_GENESIS, logLevel)
    const coreSpotDeployment = getCoreSpotDeployment(coreSpotTokenId, isTestnet, logger)

    const maxUserWei = coreSpotDeployment.userGenesis.userAndWei.reduce(
        (acc, user) => acc + BigInt(user.wei),
        BigInt(0)
    )
    const maxExistingTokenWei = coreSpotDeployment.userGenesis.existingTokenAndWei.reduce(
        (acc, token) => acc + BigInt(token.wei),
        BigInt(0)
    )

    const configMaxSupply = maxUserWei + maxExistingTokenWei

    logger.verbose(`Max supply: ${configMaxSupply} (u64.max-1: ${MAX_HYPERCORE_SUPPLY})`)

    if (configMaxSupply > MAX_HYPERCORE_SUPPLY) {
        logger.error(
            `Total user and existing token wei exceeds the maximum hypercore supply: ${configMaxSupply} > ${MAX_HYPERCORE_SUPPLY} (u64.max-1)`
        )
        process.exit(1)
    }

    const actionForGenesis: SpotDeployAction['action'] = {
        type: 'spotDeploy',
        genesis: {
            token: coreSpotTokenId,
            maxSupply: configMaxSupply.toString(),
            noHyperliquidity: true,
        },
    }

    logger.info('Setting genesis')
    const hyperliquidClient = new HyperliquidClient(isTestnet, logLevel)
    const response = await hyperliquidClient.submitHyperliquidAction('/exchange', wallet, actionForGenesis)
    return response
}

export async function setNoHyperliquidity(wallet: Wallet, isTestnet: boolean, tokenIndex: number, logLevel: string) {
    const logger = createModuleLogger(LOGGER_MODULES.SET_NO_HYPERLIQUIDITY, logLevel)

    const deployStates = (await getSpotDeployState(wallet.address, isTestnet, logLevel)) as SpotDeployStates

    const state = deployStates.states.find((state) => state.token === tokenIndex)
    if (!state) {
        logger.error(
            `No in progress deployment state found for token ${tokenIndex}. This means your token is deployed.`
        )
        process.exit(1)
    }

    const spotIds = state.spots

    logger.info(
        `For information on valid input values, refer to: https://hyperliquid.gitbook.io/hyperliquid-docs/hyperliquid-improvement-proposals-hips/frontend-checks#hyperliquidity`
    )
    logger.info(`Available spot ids: ${spotIds}`)
    const { spotId } = await inquirer.prompt([
        {
            type: 'input',
            name: 'spotId',
            message: `Enter the spot id that you would like to create a spot deployment for.`,
        },
    ])

    if (!spotIds.includes(parseInt(spotId))) {
        logger.error(`Invalid spot id: ${spotId}`)
        process.exit(1)
    }

    logger.info(
        'The following values will be set: startPx as 1, orderSz as 0, and nOrders as 0. This is because the pricing is determined by the market as we do not support hyperliquidity, which is what these values are used for.'
    )

    const { startPxApprox } = await inquirer.prompt([
        {
            type: 'input',
            name: 'startPxApprox',
            message: `Enter the start price of the token in the same order as what you expect it to be in. This is because market makers can't change the price to outside of 95% the current.`,
        },
    ])

    const registerHyperliquidity: RegisterHyperliquidity = {
        spot: parseInt(spotId),
        startPx: startPxApprox.toString(),
        orderSz: '0',
        nOrders: 0,
    }

    const actionForNoHyperliquidity: SpotDeployAction['action'] = {
        type: 'spotDeploy',
        registerHyperliquidity: registerHyperliquidity,
    }

    logger.info('Registering hyperliquidity')
    const hyperliquidClient = new HyperliquidClient(isTestnet, logLevel)
    const response = await hyperliquidClient.submitHyperliquidAction('/exchange', wallet, actionForNoHyperliquidity)
    return response
}

export async function registerSpot(wallet: Wallet, isTestnet: boolean, coreSpotTokenId: number, logLevel: string) {
    const logger = createModuleLogger(LOGGER_MODULES.REGISTER_TRADING_SPOT, logLevel)

    // Get existing quote tokens
    const existingQuoteTokens = await getExistingQuoteTokens(isTestnet, coreSpotTokenId, logLevel)

    // Get all quote tokens for the current network
    const networkQuoteTokens = isTestnet ? QUOTE_TOKENS.TESTNET : QUOTE_TOKENS.MAINNET

    const isFirstDeployment = existingQuoteTokens.length === 0

    // Only show auction status if this is NOT the first deployment (first is included in the token deployment/creation gas)
    if (!isFirstDeployment) {
        const auctionStatus = await getSpotPairDeployAuctionStatus(isTestnet, logLevel)

        logger.info(`Spot Pair Deploy Auction Status:`)
        logger.info('='.repeat(50))

        const startDate = new Date(auctionStatus.startTimeSeconds * 1000)
        const endDate = new Date((auctionStatus.startTimeSeconds + auctionStatus.durationSeconds) * 1000)
        const now = new Date()
        const isActive = now >= startDate && now <= endDate

        logger.info(`Start Time: ${startDate.toISOString()}`)
        logger.info(`End Time: ${endDate.toISOString()}`)
        logger.info(
            `Duration: ${auctionStatus.durationSeconds} seconds (${Math.round(auctionStatus.durationSeconds / 3600)} hours)`
        )
        logger.info(`Status: ${isActive ? 'Active' : 'Inactive'}`)
        logger.info(`Start Gas: ${auctionStatus.startGas} HYPE`)
        logger.info(`Current Gas: ${auctionStatus.currentGas} HYPE`)
        logger.info(`End Gas: ${auctionStatus.endGas || 'Not set'}`)

        if (isActive) {
            const timeLeft = endDate.getTime() - now.getTime()
            const hoursLeft = Math.round(timeLeft / (1000 * 60 * 60))
            logger.info(`Time Remaining: ~${hoursLeft} hours\n`)
        }

        // Display existing deployments
        logger.info(`Existing Spot Pairs for Token ${coreSpotTokenId}:`)
        logger.info('-'.repeat(30))
        existingQuoteTokens.forEach((quoteToken) => {
            const knownToken = networkQuoteTokens.find((t) => t.tokenId === quoteToken)
            if (knownToken) {
                logger.info(`• ${knownToken.name} (Token ${quoteToken})`)
            } else {
                logger.info(`• Token ${quoteToken}`)
            }
        })
    } else {
        logger.info(`First deployment cost is included in the deployment gas. No auction costs apply.`)
    }

    // Build prompt choices - only include tokens that haven't been deployed yet
    const choices: Array<{ name: string; value: number }> = []

    // Add all network quote tokens that haven't been deployed yet
    networkQuoteTokens.forEach((quoteToken) => {
        if (!existingQuoteTokens.includes(quoteToken.tokenId)) {
            choices.push({
                name: `${quoteToken.name} (Token ${quoteToken.tokenId})`,
                value: quoteToken.tokenId,
            })
        }
    })

    // Always add custom option
    choices.push({
        name: 'Custom quote token (enter token ID)',
        value: -1, // Special value to indicate custom input
    })

    // Always add quit option
    choices.push({
        name: 'Quit (cancel operation)',
        value: -2, // Special value to indicate quit
    })

    // Check if all standard quote tokens are already deployed
    const allStandardTokensDeployed = networkQuoteTokens.every((token) => existingQuoteTokens.includes(token.tokenId))

    if (allStandardTokensDeployed && choices.length === 2) {
        const tokenNames = networkQuoteTokens.map((t) => t.name).join(', ')
        logger.info(`\nAll standard quote tokens (${tokenNames}) are already deployed.`)
        logger.info(`You can only deploy against a custom quote token.`)
    }

    logger.info(`\nSelect a quote token to deploy core spot ${coreSpotTokenId} against:`)

    const { selectedQuoteToken } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selectedQuoteToken',
            message: 'Choose quote token:',
            choices: choices,
        },
    ])

    let quoteTokenId: number
    let quoteTokenName: string

    if (selectedQuoteToken === -2) {
        // User chose to quit
        logger.info('Operation cancelled by user.')
        process.exit(0)
    } else if (selectedQuoteToken === -1) {
        // Custom token input
        const { customTokenId } = await inquirer.prompt([
            {
                type: 'input',
                name: 'customTokenId',
                message: 'Enter the core spot token ID to use as quote token:',
                validate: (input: string) => {
                    const num = parseInt(input)
                    if (isNaN(num) || num < 0) {
                        return 'Please enter a valid positive number'
                    }
                    if (existingQuoteTokens.includes(num)) {
                        return `Token ${num} is already deployed as a quote token for this asset`
                    }
                    return true
                },
            },
        ])
        quoteTokenId = parseInt(customTokenId)
        quoteTokenName = `Token ${quoteTokenId}`
    } else {
        quoteTokenId = selectedQuoteToken
        const knownToken = networkQuoteTokens.find((t) => t.tokenId === quoteTokenId)
        quoteTokenName = knownToken ? knownToken.name : `Token ${quoteTokenId}`
    }

    const { executeTx } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'executeTx',
            message: `This transaction will create a trading spot with ${quoteTokenName} (Token ${quoteTokenId}).\nWould you like to continue?`,
            default: false,
        },
    ])

    if (!executeTx) {
        logger.info('Transaction bundle cancelled - quitting.')
        process.exit(1)
    }

    logger.info(`Register trading spot against ${quoteTokenName} (Token ${quoteTokenId})`)
    const actionForRegisterSpot: SpotDeployAction['action'] = {
        type: 'spotDeploy',
        registerSpot: {
            tokens: [coreSpotTokenId, quoteTokenId],
        },
    }

    logger.info(`Register trading spot against ${quoteTokenName}`)
    const hyperliquidClient = new HyperliquidClient(isTestnet, logLevel)
    const response = await hyperliquidClient.submitHyperliquidAction('/exchange', wallet, actionForRegisterSpot)
    return response
}

export async function enableFreezePrivilege(
    wallet: Wallet,
    isTestnet: boolean,
    coreSpotTokenId: number,
    logLevel: string
) {
    const logger = createModuleLogger(LOGGER_MODULES.ENABLE_FREEZE_PRIVILEGE, logLevel)

    const { executeTx } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'executeTx',
            message: `This will enable freeze privilege for token ${coreSpotTokenId}, allowing you to freeze/unfreeze users. This should be done BEFORE genesis. Continue?`,
            default: false,
        },
    ])

    if (!executeTx) {
        logger.info('Transaction cancelled - quitting.')
        process.exit(1)
    }

    const action: SpotDeployAction['action'] = {
        type: 'spotDeploy',
        enableFreezePrivilege: {
            token: coreSpotTokenId,
        },
    }

    logger.info('Enabling freeze privilege')
    const hyperliquidClient = new HyperliquidClient(isTestnet, logLevel)
    const response = await hyperliquidClient.submitHyperliquidAction('/exchange', wallet, action)

    if (response.status === 'ok') {
        updateFreezePrivilegeStatus(coreSpotTokenId, isTestnet, true, logger)
    }

    return response
}

export async function freezeUser(
    wallet: Wallet,
    isTestnet: boolean,
    coreSpotTokenId: number,
    userAddress: string,
    freeze: boolean,
    logLevel: string
) {
    const logger = createModuleLogger(LOGGER_MODULES.FREEZE_USER, logLevel)

    const { executeTx } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'executeTx',
            message: `This will ${freeze ? 'freeze' : 'unfreeze'} user ${userAddress} for token ${coreSpotTokenId}. Continue?`,
            default: false,
        },
    ])

    if (!executeTx) {
        logger.info('Transaction cancelled - quitting.')
        process.exit(1)
    }

    const action: SpotDeployAction['action'] = {
        type: 'spotDeploy',
        freezeUser: {
            token: coreSpotTokenId,
            user: userAddress.toLowerCase(),
            freeze: freeze,
        },
    }

    logger.info(`${freeze ? 'Freezing' : 'Unfreezing'} user ${userAddress}`)
    const hyperliquidClient = new HyperliquidClient(isTestnet, logLevel)
    const response = await hyperliquidClient.submitHyperliquidAction('/exchange', wallet, action)

    if (response.status === 'ok') {
        updateUserFreezeStatus(coreSpotTokenId, isTestnet, userAddress, freeze, logger)
    }

    return response
}

export async function revokeFreezePrivilege(
    wallet: Wallet,
    isTestnet: boolean,
    coreSpotTokenId: number,
    logLevel: string
) {
    const logger = createModuleLogger(LOGGER_MODULES.REVOKE_FREEZE_PRIVILEGE, logLevel)

    const { executeTx } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'executeTx',
            message: `This will PERMANENTLY revoke freeze privilege for token ${coreSpotTokenId}. This action is irreversible. Continue?`,
            default: false,
        },
    ])

    if (!executeTx) {
        logger.info('Transaction cancelled - quitting.')
        process.exit(1)
    }

    const action: SpotDeployAction['action'] = {
        type: 'spotDeploy',
        revokeFreezePrivilege: {
            token: coreSpotTokenId,
        },
    }

    logger.info('Revoking freeze privilege (permanent)')
    const hyperliquidClient = new HyperliquidClient(isTestnet, logLevel)
    const response = await hyperliquidClient.submitHyperliquidAction('/exchange', wallet, action)

    if (response.status === 'ok') {
        updateFreezePrivilegeStatus(coreSpotTokenId, isTestnet, false, logger)
    }

    return response
}

export async function enableQuoteToken(wallet: Wallet, isTestnet: boolean, coreSpotTokenId: number, logLevel: string) {
    const logger = createModuleLogger(LOGGER_MODULES.ENABLE_QUOTE_TOKEN, logLevel)

    const { executeTx } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'executeTx',
            message: `This will enable token ${coreSpotTokenId} to be used as a quote asset in trading pairs. This can be done after trading fee share is set. \n There are several requirements for this to be successful - reference https://t.me/hyperliquid_api/243. Continue?`,
            default: false,
        },
    ])

    if (!executeTx) {
        logger.info('Transaction cancelled - quitting.')
        process.exit(1)
    }

    const action: SpotDeployAction['action'] = {
        type: 'spotDeploy',
        enableQuoteToken: {
            token: coreSpotTokenId,
        },
    }

    logger.info('Enabling quote token capability')
    const hyperliquidClient = new HyperliquidClient(isTestnet, logLevel)
    const response = await hyperliquidClient.submitHyperliquidAction('/exchange', wallet, action)

    if (response.status === 'ok') {
        updateQuoteTokenStatus(coreSpotTokenId, isTestnet, true, logger)
    }

    return response
}
