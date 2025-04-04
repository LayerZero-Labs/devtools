import { createModuleLogger, setDefaultLogLevel } from '@layerzerolabs/io-devtools'
import inquirer from 'inquirer'

import { getHyperliquidWallet } from '@/signer'
import { setTradingFeeShare } from '@/operations'

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
