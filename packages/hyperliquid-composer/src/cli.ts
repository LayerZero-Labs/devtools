import { Command } from 'commander'
import { LogLevel } from '@layerzerolabs/io-devtools'
import { setBlock, registerToken, coreSpotDeployment } from './commands'

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

program.parse()
