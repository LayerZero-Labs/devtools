import { Command } from 'commander'
import { LogLevel } from '@layerzerolabs/io-devtools'
import {
    // Setup & Environment
    setBlock,

    // Core Spot Management
    coreSpotDeployment,

    // HIP-1 Deployment Workflow
    enableTokenFreezePrivilege,
    userGenesis,
    genesis,
    createSpotDeployment,
    registerTradingSpot,
    enableTokenQuoteAsset,
    tradingFee,

    // EVM-HyperCore Linking
    requestEvmContract,
    finalizeEvmContract,

    // Post-Launch Management
    freezeTokenUser,
    revokeTokenFreezePrivilege,

    // Info & Queries
    spotDeployState,
    hipTokenInfo,
    isAccountActivated,
    getCoreBalances,

    // Utilities
    intoAssetBridgeAddress,
} from './commands'

import { formatBalancesTable } from './io'

const program = new Command()

program.name('oft-hyperliquid-evm').description('CLI tools for HyperLiquid OFT operations and HIP-1 deployment')

// === Setup & Environment ===
program
    .command('set-block')
    .description('Set block size')
    .requiredOption('-s, --size <size>', 'Block size (big/small)')
    .requiredOption('-n, --network <network>', 'Network (mainnet/testnet)')
    .option('-l, --log-level <level>', 'Log level', LogLevel.info)
    .option('-pk, --private-key <0x>', 'Private Key')
    .action(setBlock)

// === Core Spot Management ===
program
    .command('core-spot')
    .description('Get core spot metadata information')
    .option('-a, --action <action>', 'Action (create/get)', 'get')
    .option('-oapp, --oapp-config <oapp-config>', 'OAPP config')
    .requiredOption('-idx, --token-index <token-index>', 'Token index')
    .requiredOption('-n, --network <network>', 'Network (mainnet/testnet)')
    .option('-l, --log-level <level>', 'Log level', LogLevel.info)
    .action(coreSpotDeployment)

// === HIP-1 Deployment Workflow ===
program
    .command('enable-freeze-privilege')
    .description('HIP-1 Deployment 1. Enable freeze privilege (must be done before genesis)')
    .requiredOption('-idx, --token-index <token-index>', 'Token index')
    .requiredOption('-n, --network <network>', 'Network (mainnet/testnet)')
    .option('-l, --log-level <level>', 'Log level', LogLevel.info)
    .option('-pk, --private-key <0x>', 'Private key')
    .action(enableTokenFreezePrivilege)

program
    .command('user-genesis')
    .description('HIP-1 Deployment 2. Set user genesis allocations')
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
    .description('HIP-1 Deployment 3. Deploy token with genesis')
    .requiredOption('-idx, --token-index <token-index>', 'Token index')
    .requiredOption('-n, --network <network>', 'Network (mainnet/testnet)')
    .option('-l, --log-level <level>', 'Log level', LogLevel.info)
    .option('-pk, --private-key <0x>', 'Private key')
    .action(genesis)

program
    .command('create-spot-deployment')
    .description('HIP-1 Deployment 4. Create spot deployment without hyperliquidity')
    .requiredOption('-idx, --token-index <token-index>', 'Token index')
    .requiredOption('-n, --network <network>', 'Network (mainnet/testnet)')
    .option('-l, --log-level <level>', 'Log level', LogLevel.info)
    .option('-pk, --private-key <0x>', 'Private key')
    .action(createSpotDeployment)

program
    .command('register-spot')
    .description('HIP-1 Deployment 5. Register trading spot against USDC')
    .requiredOption('-idx, --token-index <token-index>', 'Token index')
    .requiredOption('-n, --network <network>', 'Network (mainnet/testnet)')
    .option('-l, --log-level <level>', 'Log level', LogLevel.info)
    .option('-pk, --private-key <0x>', 'Private key')
    .action(registerTradingSpot)

// === Optional HIP-1 Features ===
program
    .command('trading-fee')
    .description('HIP-1 Deployment Optional. Set deployer trading fee share')
    .requiredOption('-idx, --token-index <token-index>', 'Token index')
    .requiredOption('-s, --share <share>', 'Share')
    .requiredOption('-n, --network <network>', 'Network (mainnet/testnet)')
    .option('-l, --log-level <level>', 'Log level', LogLevel.info)
    .option('-pk, --private-key <0x>', 'Private key')
    .action(tradingFee)

program
    .command('enable-quote-token')
    .description(
        'HIP-1 Deployment Optional. Enable token as quote asset - requirements: https://t.me/hyperliquid_api/243'
    )
    .requiredOption('-idx, --token-index <token-index>', 'Token index')
    .requiredOption('-n, --network <network>', 'Network (mainnet/testnet)')
    .option('-l, --log-level <level>', 'Log level', LogLevel.info)
    .option('-pk, --private-key <0x>', 'Private key')
    .action(enableTokenQuoteAsset)

// === EVM-HyperCore Linking ===
program
    .command('request-evm-contract')
    .description('Linking 1. Request to link HyperCore token to EVM contract')
    .option('-oapp, --oapp-config <oapp-config>', 'OAPP config')
    .requiredOption('-idx, --token-index <token-index>', 'Token index')
    .requiredOption('-n, --network <network>', 'Network (mainnet/testnet)')
    .option('-l, --log-level <level>', 'Log level', LogLevel.info)
    .option('-pk, --private-key <0x>', 'HyperCore Asset deployer private key')
    .action(requestEvmContract)

program
    .command('finalize-evm-contract')
    .description('Linking 2. Finalize the EVM contract linking')
    .option('-oapp, --oapp-config <oapp-config>', 'OAPP config')
    .requiredOption('-idx, --token-index <token-index>', 'Token index')
    .requiredOption('-n, --network <network>', 'Network (mainnet/testnet)')
    .option('-l, --log-level <level>', 'Log level', LogLevel.info)
    .option('-pk, --private-key <0x>', 'Private key')
    .action(finalizeEvmContract)

// === Post-Launch Management ===
program
    .command('freeze-user')
    .description('Freeze or unfreeze a specific user (only if you have enabled freeze privilege)')
    .requiredOption('-idx, --token-index <token-index>', 'Token index')
    .requiredOption('-u, --user-address <0x>', 'User address to freeze/unfreeze')
    .requiredOption('-f, --freeze <true|false>', 'True to freeze, false to unfreeze')
    .requiredOption('-n, --network <network>', 'Network (mainnet/testnet)')
    .option('-l, --log-level <level>', 'Log level', LogLevel.info)
    .option('-pk, --private-key <0x>', 'Private key')
    .action(freezeTokenUser)

program
    .command('revoke-freeze-privilege')
    .description('Permanently revoke freeze privilege (irreversible)')
    .requiredOption('-idx, --token-index <token-index>', 'Token index')
    .requiredOption('-n, --network <network>', 'Network (mainnet/testnet)')
    .option('-l, --log-level <level>', 'Log level', LogLevel.info)
    .option('-pk, --private-key <0x>', 'Private key')
    .action(revokeTokenFreezePrivilege)

// === Info & Queries ===
program
    .command('spot-deploy-state')
    .description('Get current deployment state of a token')
    .requiredOption(
        '-idx, --token-index <token-index>',
        'Filter on token index. To view all deployments, use "--log-level verbose"'
    )
    .requiredOption('-n, --network <network>', 'Network (mainnet/testnet)')
    .option('-l, --log-level <level>', 'Log level', LogLevel.info)
    .option('-da, --deployer-address <0x>', 'Core spot deployer address (optional)')
    .action(spotDeployState)

program
    .command('hip-token')
    .description('Get detailed information about a HyperCore HIP-1 token')
    .requiredOption('-idx, --token-index <token-index>', 'Token index')
    .requiredOption('-n, --network <network>', 'Network (mainnet/testnet)')
    .option('-l, --log-level <level>', 'Log level', LogLevel.info)
    .action(hipTokenInfo)

program
    .command('is-account-activated')
    .description('Check if an address is activated on HyperCore')
    .requiredOption('-u, --user <0x>', 'User address')
    .requiredOption('-n, --network <network>', 'Network (mainnet/testnet)')
    .option('-l, --log-level <level>', 'Log level', LogLevel.info)
    .action(async (options) => {
        const res = await isAccountActivated(options)
        console.log(`Account activated: ${res}`)
    })

program
    .command('get-core-balances')
    .description('Get core balances for a user')
    .requiredOption('-u, --user <0x>', 'User address')
    .requiredOption('-n, --network <network>', 'Network (mainnet/testnet)')
    .option('--show-zero', 'Show balances with zero amounts', false)
    .option('-l, --log-level <level>', 'Log level', LogLevel.info)
    .action(async (options) => {
        const balances = await getCoreBalances(options)
        console.log(formatBalancesTable(balances, options.showZero))
    })

// === Utilities ===
program
    .command('to-bridge')
    .description('Convert token index to bridge address')
    .requiredOption('-idx, --token-index <token-index>', 'Token index')
    .option('-l, --log-level <level>', 'Log level', LogLevel.info)
    .action(intoAssetBridgeAddress)

program.parse()
