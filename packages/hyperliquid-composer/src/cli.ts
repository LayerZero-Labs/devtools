import { Command } from 'commander'
import { LogLevel } from '@layerzerolabs/io-devtools'
import {
    setBlock,
    registerToken,
    coreSpotDeployment,
    tradingFee,
    userGenesis,
    genesis,
    registerTradingSpot,
} from './commands'

const program = new Command()

program.name('oft-hyperliquid-evm').description('CLI tools for HyperLiquid OFT operations')

program
    .command('set-block')
    .description('Set block size')
    .requiredOption('-s, --size <size>', 'Block size (big/small)')
    .requiredOption('-n, --network <network>', 'Network (mainnet/testnet)')
    .option('-l, --log-level <level>', 'Log level', LogLevel.info)
    .option('-pk, --private-key <0x>', 'Private Key')
    .action(setBlock)

program
    .command('register-token')
    .description('Register a token on HyperLiquid')
    .requiredOption('-idx, --token-index <token-index>', 'Token index')
    .requiredOption('-n, --network <network>', 'Network (mainnet/testnet)')
    .option('-l, --log-level <level>', 'Log level', LogLevel.info)
    .option('-pk, --private-key', 'Private key')
    .action(registerToken)

program
    .command('core-spot')
    .description('Get core spot information')
    .option('-a, --action <action>', 'Action (create/get)', 'get')
    .requiredOption('-idx, --token-index <token-index>', 'Token index')
    .requiredOption('-n, --network <network>', 'Network (mainnet/testnet)')
    .option('-l, --log-level <level>', 'Log level', LogLevel.info)
    .option('-oapp, --oapp-config <oapp-config>', 'OAPP config')
    .action(async (options) => {
        if (options.action === 'create' && !options.oappConfig) {
            throw new Error('--oapp-config is required when action is create')
        }
        await coreSpotDeployment(options)
    })

program
    .command('trading-fee')
    .description('Set trading fee share')
    .requiredOption('-idx, --token-index <token-index>', 'Token index')
    .requiredOption('-s, --share <share>', 'Share')
    .requiredOption('-n, --network <network>', 'Network (mainnet/testnet)')
    .option('-l, --log-level <level>', 'Log level', LogLevel.info)
    .option('-pk, --private-key', 'Private key')
    .action(tradingFee)

program
    .command('user-genesis')
    .description('Set user genesis')
    .option('-a, --action <action>', 'Action (userAndWei/existingTokenAndWei/blacklistUsers)', '*')
    .requiredOption('-idx, --token-index <token-index>', 'Token index')
    .requiredOption('-n, --network <network>', 'Network (mainnet/testnet)')
    .option('-l, --log-level <level>', 'Log level', LogLevel.info)
    .option('-pk, --private-key <0x>', 'Private key')
    .action(async (options) => {
        const validActions = ['*', 'userAndWei', 'existingTokenAndWei', 'blacklistUsers']
        if (!validActions.includes(options.action)) {
            throw new Error(`Invalid action: ${options.action}. Valid actions are: ${validActions.join(', ')}`)
        }
        await userGenesis(options)
    })

program
    .command('set-genesis')
    .description('Set genesis')
    .requiredOption('-idx, --token-index <token-index>', 'Token index')
    .requiredOption('-n, --network <network>', 'Network (mainnet/testnet)')
    .option('-l, --log-level <level>', 'Log level', LogLevel.info)
    .option('-pk, --private-key <0x>', 'Private key')
    .action(genesis)

program
    .command('register-spot')
    .description('Register trading spot against USDC')
    .requiredOption('-idx, --token-index <token-index>', 'Token index')
    .requiredOption('-n, --network <network>', 'Network (mainnet/testnet)')
    .option('-l, --log-level <level>', 'Log level', LogLevel.info)
    .option('-pk, --private-key <0x>', 'Private key')
    .action(registerTradingSpot)

program.parse()
