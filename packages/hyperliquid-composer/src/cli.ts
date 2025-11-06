import { Command } from 'commander'
import { LogLevel, createModuleLogger } from '@layerzerolabs/io-devtools'
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
    listSpotPairs,
    spotAuctionStatus,

    // Utilities
    intoAssetBridgeAddress,
} from './commands'

import { formatBalancesTable } from './io'
import { CLI_COMMANDS, LOGGER_MODULES } from './types/cli-constants'

const program = new Command()
const logger = createModuleLogger(LOGGER_MODULES.SDK_HYPERLIQUID_COMPOSER, LogLevel.info)

// Reusable option builders
const commonOptions = {
    tokenIndex: () => ['-idx, --token-index <token-index>', 'Token index'] as const,
    network: () => ['-n, --network <network>', 'Network (mainnet/m or testnet/t)', 'mainnet'] as const,
    logLevel: () => ['-l, --log-level <level>', 'Log level', LogLevel.info] as const,
    privateKey: () => ['-pk, --private-key <0x>', 'Private key'] as const,
    userAddress: () => ['-u, --user <0x>', 'User address'] as const,
}

// Network normalization helper
const normalizeNetwork = (network: string, wasDefaulted: boolean): { network: string; wasExpanded: boolean } => {
    const normalized = network.toLowerCase()
    let wasExpanded = false
    let result = normalized

    if (normalized === 'm') {
        result = 'mainnet'
        wasExpanded = true
    } else if (normalized === 't') {
        result = 'testnet'
        wasExpanded = true
    }

    // Log network selection for transparency
    if (wasDefaulted || wasExpanded) {
        logger.info(`Using network: ${result}`)
    }

    return { network: result, wasExpanded }
}

// Wrapper to normalize options before passing to command handlers
const withNormalizedNetwork = <T extends (...args: any[]) => any>(fn: T): T => {
    return ((...args: any[]) => {
        if (args[0] && typeof args[0] === 'object' && 'network' in args[0]) {
            const originalNetwork = args[0].network
            const wasDefaulted = originalNetwork === 'mainnet' && !process.argv.some((arg) => arg.includes('network'))
            const { network } = normalizeNetwork(originalNetwork, wasDefaulted)
            args[0].network = network
        }
        return fn(...args)
    }) as T
}

// Combined option groups - apply multiple options at once
const optionGroups = {
    // Base group: network + log-level (used by almost all commands)
    base: (cmd: Command) => cmd.option(...commonOptions.network()).option(...commonOptions.logLevel()),

    // Standard deployment: base + token-index + private-key
    deployment: (cmd: Command) =>
        optionGroups
            .base(cmd)
            .requiredOption(...commonOptions.tokenIndex())
            .option(...commonOptions.privateKey()),

    // User query: base + user address
    userQuery: (cmd: Command) => optionGroups.base(cmd).requiredOption(...commonOptions.userAddress()),

    // EVM linking: deployment
    evmLinking: (cmd: Command) => optionGroups.deployment(cmd),
}

program.name('oft-hyperliquid-evm').description('CLI tools for HyperLiquid OFT operations and HIP-1 deployment')

// === Setup & Environment ===
optionGroups
    .base(
        program
            .command(CLI_COMMANDS.SET_BLOCK)
            .description('Set block size')
            .requiredOption('-s, --size <size>', 'Block size (big/small)')
            .option('--ci', 'CI mode - skip confirmation prompts', false)
    )
    .option(...commonOptions.privateKey())
    .action(withNormalizedNetwork(setBlock))

// === Core Spot Management ===
optionGroups
    .base(
        program
            .command(CLI_COMMANDS.CORE_SPOT)
            .description('Get core spot metadata information')
            .option('-a, --action <action>', 'Action (create/get)', 'get')
            .requiredOption(...commonOptions.tokenIndex())
    )
    .action(withNormalizedNetwork(coreSpotDeployment))

// === HIP-1 Deployment Workflow ===
optionGroups
    .deployment(
        program
            .command(CLI_COMMANDS.ENABLE_FREEZE_PRIVILEGE)
            .description('HIP-1 Deployment 1. Enable freeze privilege (must be done before genesis)')
    )
    .action(withNormalizedNetwork(enableTokenFreezePrivilege))

optionGroups
    .deployment(
        program
            .command(CLI_COMMANDS.USER_GENESIS)
            .description('HIP-1 Deployment 2. Set user genesis allocations')
            .option('-a, --action <action>', 'Action (userAndWei/existingTokenAndWei/blacklistUsers)', '*')
    )
    .action(
        withNormalizedNetwork(async (options) => {
            const validActions = ['*', 'userAndWei', 'existingTokenAndWei', 'blacklistUsers']
            if (!validActions.includes(options.action)) {
                throw new Error(`Invalid action: ${options.action}. Valid actions are: ${validActions.join(', ')}`)
            }
            await userGenesis(options)
        })
    )

optionGroups
    .deployment(program.command(CLI_COMMANDS.SET_GENESIS).description('HIP-1 Deployment 3. Deploy token with genesis'))
    .action(withNormalizedNetwork(genesis))

optionGroups
    .deployment(
        program
            .command(CLI_COMMANDS.CREATE_SPOT_DEPLOYMENT)
            .description('HIP-1 Deployment 4. Create spot deployment without hyperliquidity')
    )
    .action(withNormalizedNetwork(createSpotDeployment))

optionGroups
    .deployment(
        program
            .command(CLI_COMMANDS.REGISTER_SPOT)
            .description('HIP-1 Deployment 5. Register trading spot against USDC')
    )
    .action(withNormalizedNetwork(registerTradingSpot))

// === Optional HIP-1 Features ===
optionGroups
    .deployment(
        program
            .command(CLI_COMMANDS.TRADING_FEE)
            .description('HIP-1 Deployment Optional. Set deployer trading fee share')
            .requiredOption('-s, --share <share>', 'Share')
    )
    .action(withNormalizedNetwork(tradingFee))

optionGroups
    .deployment(
        program
            .command(CLI_COMMANDS.ENABLE_QUOTE_TOKEN)
            .description(
                'HIP-1 Deployment Optional. Enable token as quote asset - requirements: https://t.me/hyperliquid_api/243'
            )
    )
    .action(withNormalizedNetwork(enableTokenQuoteAsset))

// === EVM-HyperCore Linking ===
optionGroups
    .evmLinking(
        program
            .command(CLI_COMMANDS.REQUEST_EVM_CONTRACT)
            .description('Linking 1. Request to link HyperCore token to EVM contract')
    )
    .option('-pk, --private-key <0x>', 'HyperCore Asset deployer private key')
    .action(withNormalizedNetwork(requestEvmContract))

optionGroups
    .evmLinking(
        program.command(CLI_COMMANDS.FINALIZE_EVM_CONTRACT).description('Linking 2. Finalize the EVM contract linking')
    )
    .action(withNormalizedNetwork(finalizeEvmContract))

// === Post-Launch Management ===
optionGroups
    .deployment(
        program
            .command(CLI_COMMANDS.FREEZE_USER)
            .description('Freeze or unfreeze a specific user (only if you have enabled freeze privilege)')
            .requiredOption('-u, --user-address <0x>', 'User address to freeze/unfreeze')
            .requiredOption('-f, --freeze <true|false>', 'True to freeze, false to unfreeze')
    )
    .action(withNormalizedNetwork(freezeTokenUser))

optionGroups
    .deployment(
        program
            .command(CLI_COMMANDS.REVOKE_FREEZE_PRIVILEGE)
            .description('Permanently revoke freeze privilege (irreversible)')
    )
    .action(withNormalizedNetwork(revokeTokenFreezePrivilege))

// === Info & Queries ===
optionGroups
    .base(
        program
            .command(CLI_COMMANDS.SPOT_DEPLOY_STATE)
            .description('Get current deployment state of a token')
            .requiredOption(
                '-idx, --token-index <token-index>',
                'Filter on token index. To view all deployments, use "--log-level verbose"'
            )
            .option('-da, --deployer-address <0x>', 'Core spot deployer address (optional)')
    )
    .action(withNormalizedNetwork(spotDeployState))

optionGroups
    .base(
        program
            .command(CLI_COMMANDS.HIP_TOKEN)
            .description('Get detailed information about a HyperCore HIP-1 token')
            .requiredOption(...commonOptions.tokenIndex())
    )
    .action(withNormalizedNetwork(hipTokenInfo))

optionGroups
    .userQuery(
        program.command(CLI_COMMANDS.IS_ACCOUNT_ACTIVATED).description('Check if an address is activated on HyperCore')
    )
    .action(
        withNormalizedNetwork(async (options) => {
            const res = await isAccountActivated(options)
            logger.info(`Account activated: ${res}`)
        })
    )

optionGroups
    .userQuery(
        program
            .command(CLI_COMMANDS.GET_CORE_BALANCES)
            .description('Get core balances for a user')
            .option('--show-zero', 'Show balances with zero amounts', false)
    )
    .action(
        withNormalizedNetwork(async (options) => {
            const balances = await getCoreBalances(options)
            logger.info(formatBalancesTable(balances, options.showZero))
        })
    )

optionGroups
    .base(
        program
            .command(CLI_COMMANDS.LIST_SPOT_PAIRS)
            .description('List all spot trading pairs for a given token index')
            .requiredOption(...commonOptions.tokenIndex())
    )
    .action(withNormalizedNetwork(listSpotPairs))

optionGroups
    .base(
        program
            .command(CLI_COMMANDS.SPOT_AUCTION_STATUS)
            .description('Show current spot pair deploy auction status and gas costs')
    )
    .action(withNormalizedNetwork(spotAuctionStatus))

// === Utilities ===
optionGroups
    .base(
        program
            .command(CLI_COMMANDS.TO_BRIDGE)
            .description('Convert token index to bridge address')
            .requiredOption(...commonOptions.tokenIndex())
    )
    .action(withNormalizedNetwork(intoAssetBridgeAddress))

program.parse()
