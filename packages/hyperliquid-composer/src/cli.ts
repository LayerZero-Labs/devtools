import { Command } from 'commander'
import { LogLevel } from '@layerzerolabs/io-devtools'
import {
    setBlock,
    requestEvmContract,
    finalizeEvmContract,
    coreSpotDeployment,
    intoAssetBridgeAddress,
    hipTokenInfo,
    tradingFee,
    userGenesis,
    genesis,
    registerTradingSpot,
    spotDeployState,
} from './commands'

const program = new Command()

program.name('oft-hyperliquid-evm').description('CLI tools for HyperLiquid OFT operations')

program
    .command('to-bridge')
    .description('Returns the asset bridge address for a token index')
    .requiredOption('-idx, --token-index <token-index>', 'Token index')
    .option('-l, --log-level <level>', 'Log level', LogLevel.info)
    .action(intoAssetBridgeAddress)

program
    .command('set-block')
    .description('Set block size')
    .requiredOption('-s, --size <size>', 'Block size (big/small)')
    .requiredOption('-n, --network <network>', 'Network (mainnet/testnet)')
    .option('-l, --log-level <level>', 'Log level', LogLevel.info)
    .option('-pk, --private-key <0x>', 'Private Key')
    .action(setBlock)

program
    .command('request-evm-contract')
    .description('Set the core spot to connect to an EVM contract')
    .option('-oapp, --oapp-config <oapp-config>', 'OAPP config')
    .requiredOption('-idx, --token-index <token-index>', 'Token index')
    .requiredOption('-n, --network <network>', 'Network (mainnet/testnet)')
    .option('-l, --log-level <level>', 'Log level', LogLevel.info)
    .option('-pk, --private-key <0x>', 'HyperCore Asset deployer private key')
    .action(requestEvmContract)

program
    .command('finalize-evm-contract')
    .description('Finalize the EVM contract')
    .option('-oapp, --oapp-config <oapp-config>', 'OAPP config')
    .requiredOption('-idx, --token-index <token-index>', 'Token index')
    .requiredOption('-n, --network <network>', 'Network (mainnet/testnet)')
    .option('-l, --log-level <level>', 'Log level', LogLevel.info)
    .option('-pk, --private-key <0x>', 'Private key')
    .action(finalizeEvmContract)

program
    .command('core-spot')
    .description('Get core spot metadata information')
    .option('-a, --action <action>', 'Action (create/get)', 'get')
    .option('-oapp, --oapp-config <oapp-config>', 'OAPP config')
    .requiredOption('-idx, --token-index <token-index>', 'Token index')
    .requiredOption('-n, --network <network>', 'Network (mainnet/testnet)')
    .option('-l, --log-level <level>', 'Log level', LogLevel.info)
    .action(coreSpotDeployment)

program
    .command('hip-token')
    .description('Get information about a HyperCore HIP-1 token')
    .requiredOption('-idx, --token-index <token-index>', 'Token index')
    .requiredOption('-n, --network <network>', 'Network (mainnet/testnet)')
    .option('-l, --log-level <level>', 'Log level', LogLevel.info)
    .action(hipTokenInfo)

program
    .command('spot-deploy-state')
    .description('Get the current deployment state of a hypercore token')
    .requiredOption('-idx, --token-index <token-index>', 'Token index')
    .requiredOption('-n, --network <network>', 'Network (mainnet/testnet)')
    .option('-l, --log-level <level>', 'Log level', LogLevel.info)
    .option('-da, --deployer-address <0x>', 'Core spot deployer address (optional)')
    .action(spotDeployState)

program
    .command('trading-fee')
    .description('Set trading fee share')
    .requiredOption('-idx, --token-index <token-index>', 'Token index')
    .requiredOption('-s, --share <share>', 'Share')
    .requiredOption('-n, --network <network>', 'Network (mainnet/testnet)')
    .option('-l, --log-level <level>', 'Log level', LogLevel.info)
    .option('-pk, --private-key <0x>', 'Private key')
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
