import { createModuleLogger, setDefaultLogLevel } from '@layerzerolabs/io-devtools'
import inquirer from 'inquirer'

import { getHyperliquidWallet } from '@/signer'
import {
    setTradingFeeShare,
    setUserGenesis,
    setGenesis,
    setNoHyperliquidity,
    registerSpot,
    enableFreezePrivilege,
    freezeUser,
    revokeFreezePrivilege,
    enableQuoteToken,
} from '@/operations'
import { LOGGER_MODULES } from '@/types/cli-constants'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function tradingFee(args: any): Promise<void> {
    setDefaultLogLevel(args.logLevel)
    const logger = createModuleLogger(LOGGER_MODULES.TRADING_FEE, args.logLevel)

    const wallet = await getHyperliquidWallet(args.privateKey)
    const isTestnet = args.network === 'testnet'

    logger.info(`Setting trading fee share for token ${args.tokenIndex} to ${args.share}`)

    const { executeTx } = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'executeTx',
            message: `Trading fee can ONLY be decreased. Do you want to execute the transaction?`,
            default: false,
        },
    ])

    if (!executeTx) {
        logger.info('Transaction cancelled - quitting.')
        process.exit(1)
    }

    const tokenIndex: number = parseInt(args.tokenIndex)
    const share: string = args.share

    logger.info(`Setting trading fee share for token ${tokenIndex} to ${share}`)

    await setTradingFeeShare(wallet, isTestnet, tokenIndex, share, args.logLevel)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function userGenesis(args: any): Promise<void> {
    setDefaultLogLevel(args.logLevel)
    const logger = createModuleLogger(LOGGER_MODULES.USER_GENESIS, args.logLevel)

    const wallet = await getHyperliquidWallet(args.privateKey)
    const isTestnet = args.network === 'testnet'
    const action = args.action

    logger.info(`Setting user genesis for token ${args.tokenIndex}`)

    const tokenIndex: number = parseInt(args.tokenIndex)

    await setUserGenesis(wallet, isTestnet, tokenIndex, action, args.logLevel)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function genesis(args: any): Promise<void> {
    setDefaultLogLevel(args.logLevel)
    const logger = createModuleLogger(LOGGER_MODULES.GENESIS, args.logLevel)

    const wallet = await getHyperliquidWallet(args.privateKey)
    const isTestnet = args.network === 'testnet'

    logger.info(`Setting genesis for token ${args.tokenIndex}`)

    const tokenIndex: number = parseInt(args.tokenIndex)

    await setGenesis(wallet, isTestnet, tokenIndex, args.logLevel)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createSpotDeployment(args: any): Promise<void> {
    setDefaultLogLevel(args.logLevel)
    const logger = createModuleLogger(LOGGER_MODULES.CREATE_SPOT_DEPLOYMENT, args.logLevel)

    const wallet = await getHyperliquidWallet(args.privateKey)
    const isTestnet = args.network === 'testnet'
    const tokenIndex: number = parseInt(args.tokenIndex)

    logger.info(`Setting no hyperliquidity for token ${tokenIndex}`)

    await setNoHyperliquidity(wallet, isTestnet, tokenIndex, args.logLevel)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function registerTradingSpot(args: any): Promise<void> {
    setDefaultLogLevel(args.logLevel)
    const logger = createModuleLogger(LOGGER_MODULES.REGISTER_TRADING_SPOT, args.logLevel)

    const wallet = await getHyperliquidWallet(args.privateKey)
    const isTestnet = args.network === 'testnet'

    logger.info(`Registering core spot ${args.tokenIndex} for trading`)

    const tokenIndex: number = parseInt(args.tokenIndex)

    await registerSpot(wallet, isTestnet, tokenIndex, args.logLevel)
}

// === Post-Launch Management Functions ===

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function enableTokenFreezePrivilege(args: any): Promise<void> {
    setDefaultLogLevel(args.logLevel)
    const logger = createModuleLogger(LOGGER_MODULES.ENABLE_FREEZE_PRIVILEGE, args.logLevel)

    const wallet = await getHyperliquidWallet(args.privateKey)
    const isTestnet = args.network === 'testnet'
    const tokenIndex: number = parseInt(args.tokenIndex)

    logger.info(`Enabling freeze privilege for token ${tokenIndex}`)

    await enableFreezePrivilege(wallet, isTestnet, tokenIndex, args.logLevel)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function freezeTokenUser(args: any): Promise<void> {
    setDefaultLogLevel(args.logLevel)
    const logger = createModuleLogger(LOGGER_MODULES.FREEZE_USER, args.logLevel)

    const wallet = await getHyperliquidWallet(args.privateKey)
    const isTestnet = args.network === 'testnet'
    const tokenIndex: number = parseInt(args.tokenIndex)
    const userAddress: string = args.userAddress
    const freeze: boolean = args.freeze === 'true'

    logger.info(`${freeze ? 'Freezing' : 'Unfreezing'} user ${userAddress} for token ${tokenIndex}`)

    await freezeUser(wallet, isTestnet, tokenIndex, userAddress, freeze, args.logLevel)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function revokeTokenFreezePrivilege(args: any): Promise<void> {
    setDefaultLogLevel(args.logLevel)
    const logger = createModuleLogger(LOGGER_MODULES.REVOKE_FREEZE_PRIVILEGE, args.logLevel)

    const wallet = await getHyperliquidWallet(args.privateKey)
    const isTestnet = args.network === 'testnet'
    const tokenIndex: number = parseInt(args.tokenIndex)

    logger.info(`Revoking freeze privilege for token ${tokenIndex}`)

    await revokeFreezePrivilege(wallet, isTestnet, tokenIndex, args.logLevel)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function enableTokenQuoteAsset(args: any): Promise<void> {
    setDefaultLogLevel(args.logLevel)
    const logger = createModuleLogger(LOGGER_MODULES.ENABLE_QUOTE_TOKEN, args.logLevel)

    const wallet = await getHyperliquidWallet(args.privateKey)
    const isTestnet = args.network === 'testnet'
    const tokenIndex: number = parseInt(args.tokenIndex)

    logger.info(`Enabling quote token capability for token ${tokenIndex}`)

    await enableQuoteToken(wallet, isTestnet, tokenIndex, args.logLevel)
}
