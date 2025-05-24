import { createModuleLogger, setDefaultLogLevel } from '@layerzerolabs/io-devtools'
import inquirer from 'inquirer'

import { getHyperliquidWallet } from '@/signer'
import { setTradingFeeShare, setUserGenesis, setGenesis, setNoHyperliquidity, registerSpot } from '@/operations'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function tradingFee(args: any): Promise<void> {
    setDefaultLogLevel(args.logLevel)
    const logger = createModuleLogger('trading-fee', args.logLevel)

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
    const logger = createModuleLogger('user-genesis', args.logLevel)

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
    const logger = createModuleLogger('genesis', args.logLevel)

    const wallet = await getHyperliquidWallet(args.privateKey)
    const isTestnet = args.network === 'testnet'

    logger.info(`Setting genesis for token ${args.tokenIndex}`)

    const tokenIndex: number = parseInt(args.tokenIndex)

    await setGenesis(wallet, isTestnet, tokenIndex, args.logLevel)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function createSpotDeployment(args: any): Promise<void> {
    setDefaultLogLevel(args.logLevel)
    const logger = createModuleLogger('createSpotDeployment', args.logLevel)

    const wallet = await getHyperliquidWallet(args.privateKey)
    const isTestnet = args.network === 'testnet'
    const tokenIndex: number = parseInt(args.tokenIndex)

    logger.info(`Setting no hyperliquidity for token ${tokenIndex}`)

    await setNoHyperliquidity(wallet, isTestnet, tokenIndex, args.logLevel)
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function registerTradingSpot(args: any): Promise<void> {
    setDefaultLogLevel(args.logLevel)
    const logger = createModuleLogger('registerSpot', args.logLevel)

    const wallet = await getHyperliquidWallet(args.privateKey)
    const isTestnet = args.network === 'testnet'

    logger.info(`Registering core spot ${args.tokenIndex} for trading`)

    const tokenIndex: number = parseInt(args.tokenIndex)

    await registerSpot(wallet, isTestnet, tokenIndex, args.logLevel)
}
