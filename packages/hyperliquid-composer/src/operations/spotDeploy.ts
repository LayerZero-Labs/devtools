import { createModuleLogger } from '@layerzerolabs/io-devtools'
import { Wallet } from 'ethers'
import inquirer from 'inquirer'

import { getCoreSpotDeployment } from '../io'
import { HyperliquidClient } from '../signer'
import { MAX_HYPERCORE_SUPPLY, USDC_TOKEN_ID } from '../types'
import { getSpotDeployState } from './spotMeta'
import type { SpotDeployAction, SpotDeployStates } from '../types'
import { RegisterHyperliquidity } from '@/types/spotDeploy'

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
    const logger = createModuleLogger('setUserGenesis', logLevel)
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
    const logger = createModuleLogger('setGenesis', logLevel)
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
    const logger = createModuleLogger('setNoHyperliquidity', logLevel)

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
        'Values for startPx, orderSz, and nOrders are expected to be 0. This is because the pricing is determined by the market as we do not support hyperliquidity, which is what these values are used for.'
    )

    const registerHyperliquidity: RegisterHyperliquidity = {
        spot: parseInt(spotId),
        startPx: '1',
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
    const logger = createModuleLogger('register-spot', logLevel)

    const { executeTx } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'executeTx',
            message: `This transaction will create a trading spot with USDC (which is the only supported quote token by Hyperliquid at the moment).\n Would you like to continue?`,
            default: false,
        },
    ])

    if (!executeTx) {
        logger.info('Transaction bundle cancelled - quitting.')
        process.exit(1)
    }

    const usdc_tokenId = isTestnet ? USDC_TOKEN_ID.TESTNET : USDC_TOKEN_ID.MAINNET
    const actionForRegisterSpot: SpotDeployAction['action'] = {
        type: 'spotDeploy',
        registerSpot: {
            tokens: [coreSpotTokenId, usdc_tokenId],
        },
    }

    logger.info('Register trading spot against USDC')
    const hyperliquidClient = new HyperliquidClient(isTestnet, logLevel)
    const response = await hyperliquidClient.submitHyperliquidAction('/exchange', wallet, actionForRegisterSpot)
    return response
}
