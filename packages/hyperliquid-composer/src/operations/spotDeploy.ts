import { createModuleLogger } from '@layerzerolabs/io-devtools'
import inquirer from 'inquirer'

import {
    getCoreSpotDeployment,
    updateFreezePrivilegeStatus,
    updateQuoteTokenStatus,
    updateUserFreezeStatus,
} from '../io'
import { HyperliquidClient, IHyperliquidSigner } from '../signer'
import { MAX_HYPERCORE_SUPPLY, QUOTE_TOKENS } from '../types'
import {
    getSpotDeployState,
    getExistingQuoteTokens,
    getSpotPairDeployAuctionStatus,
    isQuoteAsset,
    getPendingSpotPairs,
} from './spotMeta'
import type { SpotDeployAction, SpotDeployStates } from '../types'
import { RegisterHyperliquidity } from '@/types/spotDeploy'
import { LOGGER_MODULES } from '@/types/cli-constants'

export async function setTradingFeeShare(
    signer: IHyperliquidSigner,
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
    const response = await hyperliquidClient.submitHyperliquidAction('/exchange', signer, action)
    return response
}

export async function setUserGenesis(
    signer: IHyperliquidSigner,
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
            signer,
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
            signer,
            actionForBlacklistUsers
        )
    }

    return { responseForUserGenesis, responseForBlacklistUsers }
}

export async function setGenesis(
    signer: IHyperliquidSigner,
    isTestnet: boolean,
    coreSpotTokenId: number,
    logLevel: string
) {
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
    const response = await hyperliquidClient.submitHyperliquidAction('/exchange', signer, actionForGenesis)
    return response
}

export async function setNoHyperliquidity(
    signer: IHyperliquidSigner,
    isTestnet: boolean,
    tokenIndex: number,
    logLevel: string,
    directSpotIndex?: number
) {
    const logger = createModuleLogger(LOGGER_MODULES.SET_NO_HYPERLIQUIDITY, logLevel)

    let finalSpotId: number

    // If spot index is directly provided, skip all discovery
    if (directSpotIndex !== undefined) {
        logger.info(`Using directly provided spot index: ${directSpotIndex}`)
        finalSpotId = directSpotIndex
    } else {
        // Discovery mode - find available spot ids
        const signerAddress = await signer.getAddress()
        const deployStates = (await getSpotDeployState(signerAddress, isTestnet, logLevel)) as SpotDeployStates

        const state = deployStates.states.find((state) => state.token === tokenIndex)

        let spotIds: number[] = []
        let isPendingSpotMode = false

        if (!state) {
            // Token is already deployed - check for pending spot pairs in spotMetaAndAssetCtxs
            logger.info(
                `No in progress deployment state found for token ${tokenIndex}. Checking for pending spot pairs network-wide...`
            )

            const pendingSpots = await getPendingSpotPairs(isTestnet, logLevel)

            if (pendingSpots.length === 0) {
                logger.error(`No pending spot pairs found network-wide.`)
                logger.info(`Tip: If you know the spot index, use --spot-index <id> to directly specify it.`)
                process.exit(1)
            }

            logger.warn(
                `WARNING: The API does not provide token composition for pending spots. ` +
                    `The following are ALL pending spots network-wide, not filtered by token ${tokenIndex}.`
            )
            logger.warn(`Use --spot-index <id> to directly specify your spot if you know it from register-spot output.`)
            logger.info(`Found ${pendingSpots.length} pending spot pair(s) network-wide:`)
            pendingSpots.forEach((spot) => {
                logger.info(`  - ${spot.coin} (spot index: ${spot.spotIndex}, markPx: ${spot.markPx})`)
            })

            spotIds = pendingSpots.map((spot) => spot.spotIndex)
            isPendingSpotMode = true
        } else {
            spotIds = state.spots
        }

        logger.info(
            `For information on valid input values, refer to: https://hyperliquid.gitbook.io/hyperliquid-docs/hyperliquid-improvement-proposals-hips/frontend-checks#hyperliquidity`
        )
        logger.info(`Available spot ids: ${spotIds.join(', ')}`)

        const { spotId } = await inquirer.prompt([
            {
                type: 'input',
                name: 'spotId',
                message: isPendingSpotMode
                    ? `Enter the pending spot id to finalize:`
                    : `Enter the spot id that you would like to create a spot deployment for.`,
            },
        ])

        if (!spotIds.includes(parseInt(spotId))) {
            logger.error(`Invalid spot id: ${spotId}. Available: ${spotIds.join(', ')}`)
            process.exit(1)
        }

        finalSpotId = parseInt(spotId)
    }

    logger.info(
        'The following values will be set: startPx, orderSz as 0, and nOrders as 0. This is because the pricing is determined by the market as we do not support hyperliquidity.'
    )

    const { startPxApprox } = await inquirer.prompt([
        {
            type: 'input',
            name: 'startPxApprox',
            message: `Enter the start price of the token (approximate order of magnitude). Market makers can't change price outside of 95% of this.`,
            default: '1.0',
        },
    ])

    const registerHyperliquidity: RegisterHyperliquidity = {
        spot: finalSpotId,
        startPx: startPxApprox.toString(),
        orderSz: '0',
        nOrders: 0,
    }

    const actionForNoHyperliquidity: SpotDeployAction['action'] = {
        type: 'spotDeploy',
        registerHyperliquidity: registerHyperliquidity,
    }

    logger.info(`Finalizing spot pair ${finalSpotId} with registerHyperliquidity (no hyperliquidity)`)
    const hyperliquidClient = new HyperliquidClient(isTestnet, logLevel)
    const response = await hyperliquidClient.submitHyperliquidAction('/exchange', signer, actionForNoHyperliquidity)
    return response
}

export async function registerSpot(
    signer: IHyperliquidSigner,
    isTestnet: boolean,
    coreSpotTokenId: number,
    logLevel: string
) {
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
    networkQuoteTokens.forEach((quoteToken: { tokenId: number; name: string }) => {
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
                validate: async (input: string) => {
                    // Allow user to quit
                    if (input.toLowerCase() === 'q') {
                        console.log('\nOperation cancelled by user.\n')
                        process.exit(0)
                    }

                    const num = parseInt(input)
                    if (isNaN(num) || num < 0) {
                        return 'Please enter a valid positive number (or "q" as the token ID to quit)'
                    }
                    if (existingQuoteTokens.includes(num)) {
                        return `Token ${num} is already deployed as a quote token for this asset`
                    }

                    // Check if the token is a quote asset
                    try {
                        const { isQuoteAsset: isQuote } = await isQuoteAsset(isTestnet, num, logLevel)
                        if (!isQuote) {
                            return `Token ${num} is not a recognized quote asset on the Hyperliquid protocol. Only quote assets (tokens paired with HYPE) can be used. Enter "q" as the token ID to quit.`
                        }
                        return true
                    } catch (error) {
                        // If check fails, don't allow
                        return `Unable to verify if token ${num} is a quote asset. Enter "q" as the token ID to quit.`
                    }
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
    const response = await hyperliquidClient.submitHyperliquidAction('/exchange', signer, actionForRegisterSpot)

    // Parse and display the allocated spot index
    if (response.status === 'ok' && response.response?.data?.spot !== undefined) {
        const spotIndex = response.response.data.spot
        logger.info('')
        logger.info('='.repeat(60))
        logger.info('SPOT REGISTRATION SUCCESSFUL')
        logger.info('='.repeat(60))
        logger.info(`Allocated Spot Index: ${spotIndex}`)
        logger.info(`Base Token: ${coreSpotTokenId}`)
        logger.info(`Quote Token: ${quoteTokenName} (${quoteTokenId})`)
        logger.info('')
        logger.info('NEXT STEP: Finalize the spot pair with:')
        logger.info(`  npx @layerzerolabs/hyperliquid-composer create-spot-deployment \\`)
        logger.info(`      --token-index ${coreSpotTokenId} \\`)
        logger.info(`      --network ${isTestnet ? 'testnet' : 'mainnet'} \\`)
        logger.info(`      --spot-index ${spotIndex} \\`)
        logger.info(`      --private-key $PRIVATE_KEY`)
        logger.info('='.repeat(60))
    } else if (response.status === 'ok') {
        // Response ok but no spot data - try to extract from statuses
        const statuses = response.response?.statuses
        let foundSpot = false
        if (statuses && Array.isArray(statuses)) {
            for (const status of statuses) {
                if (status.spot !== undefined) {
                    const spotIndex = status.spot
                    logger.info('')
                    logger.info('='.repeat(60))
                    logger.info('SPOT REGISTRATION SUCCESSFUL')
                    logger.info('='.repeat(60))
                    logger.info(`Allocated Spot Index: ${spotIndex}`)
                    logger.info('')
                    logger.info('NEXT STEP: Finalize the spot pair with:')
                    logger.info(`  npx @layerzerolabs/hyperliquid-composer create-spot-deployment \\`)
                    logger.info(`      --token-index ${coreSpotTokenId} \\`)
                    logger.info(`      --network ${isTestnet ? 'testnet' : 'mainnet'} \\`)
                    logger.info(`      --spot-index ${spotIndex} \\`)
                    logger.info(`      --private-key $PRIVATE_KEY`)
                    logger.info('='.repeat(60))
                    foundSpot = true
                    break
                }
            }
        }
        if (!foundSpot) {
            // Fallback: transaction succeeded but spot index not found in response
            logger.info('')
            logger.info('='.repeat(60))
            logger.info('SPOT REGISTRATION SUCCESSFUL')
            logger.info('='.repeat(60))
            logger.info('Note: Could not extract spot index from response.')
            logger.info('Check the transaction on the explorer to find the allocated spot index.')
            logger.info('')
            logger.info('Once you have the spot index, finalize with:')
            logger.info(`  npx @layerzerolabs/hyperliquid-composer create-spot-deployment \\`)
            logger.info(`      --token-index ${coreSpotTokenId} \\`)
            logger.info(`      --network ${isTestnet ? 'testnet' : 'mainnet'} \\`)
            logger.info(`      --spot-index <SPOT_INDEX> \\`)
            logger.info(`      --private-key $PRIVATE_KEY`)
            logger.info('='.repeat(60))
        }
    }

    return response
}

export async function enableFreezePrivilege(
    signer: IHyperliquidSigner,
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
    const response = await hyperliquidClient.submitHyperliquidAction('/exchange', signer, action)

    if (response.status === 'ok') {
        updateFreezePrivilegeStatus(coreSpotTokenId, isTestnet, true, logger)
    }

    return response
}

export async function freezeUser(
    signer: IHyperliquidSigner,
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
    const response = await hyperliquidClient.submitHyperliquidAction('/exchange', signer, action)

    if (response.status === 'ok') {
        updateUserFreezeStatus(coreSpotTokenId, isTestnet, userAddress, freeze, logger)
    }

    return response
}

export async function revokeFreezePrivilege(
    signer: IHyperliquidSigner,
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
    const response = await hyperliquidClient.submitHyperliquidAction('/exchange', signer, action)

    if (response.status === 'ok') {
        updateFreezePrivilegeStatus(coreSpotTokenId, isTestnet, false, logger)
    }

    return response
}

export async function enableQuoteToken(
    signer: IHyperliquidSigner,
    isTestnet: boolean,
    coreSpotTokenId: number,
    logLevel: string
) {
    const logger = createModuleLogger(LOGGER_MODULES.ENABLE_QUOTE_TOKEN, logLevel)

    const { executeTx } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'executeTx',
            message: `This will enable token ${coreSpotTokenId} to be used as a quote asset in trading pairs. This can be done after trading fee share is set. \n There are several requirements for this to be successful - reference https://hyperliquid.gitbook.io/hyperliquid-docs/hypercore/permissionless-spot-quote-assets. Continue?`,
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
    const response = await hyperliquidClient.submitHyperliquidAction('/exchange', signer, action)

    if (response.status === 'ok') {
        updateQuoteTokenStatus(coreSpotTokenId, isTestnet, true, logger)
    }

    return response
}

export async function enableAlignedQuoteToken(
    signer: IHyperliquidSigner,
    isTestnet: boolean,
    coreSpotTokenId: number,
    logLevel: string
) {
    const logger = createModuleLogger(LOGGER_MODULES.ENABLE_ALIGNED_QUOTE_TOKEN, logLevel)

    const { executeTx } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'executeTx',
            message: `This will enable token ${coreSpotTokenId} to be used as an ALIGNED quote asset in trading pairs. Aligned quote tokens have special properties and requirements - reference https://hyperliquid.gitbook.io/hyperliquid-docs/hypercore/aligned-quote-assets. Continue?`,
            default: false,
        },
    ])

    if (!executeTx) {
        logger.info('Transaction cancelled - quitting.')
        process.exit(1)
    }

    const action: SpotDeployAction['action'] = {
        type: 'spotDeploy',
        enableAlignedQuoteToken: {
            token: coreSpotTokenId,
        },
    }

    logger.info('Enabling aligned quote token capability')
    const hyperliquidClient = new HyperliquidClient(isTestnet, logLevel)
    const response = await hyperliquidClient.submitHyperliquidAction('/exchange', signer, action)

    if (response.status === 'ok') {
        updateQuoteTokenStatus(coreSpotTokenId, isTestnet, true, logger)
    }

    return response
}
