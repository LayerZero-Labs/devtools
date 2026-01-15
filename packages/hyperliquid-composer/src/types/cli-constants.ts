/**
 * Centralized constants for CLI commands and logger identifiers
 * to ensure consistency across the hyperliquid-composer package
 */

// Base string constants - single source of truth
const STRINGS = {
    // Setup & Environment
    SET_BLOCK: 'set-block',

    // Core Spot Management
    CORE_SPOT: 'core-spot',

    // HIP-1 Deployment Workflow
    ENABLE_FREEZE_PRIVILEGE: 'enable-freeze-privilege',
    USER_GENESIS: 'user-genesis',
    SET_GENESIS: 'set-genesis',
    CREATE_SPOT_DEPLOYMENT: 'create-spot-deployment',
    REGISTER_SPOT: 'register-spot',

    // Optional HIP-1 Features
    TRADING_FEE: 'trading-fee',
    ENABLE_QUOTE_TOKEN: 'enable-quote-token',
    ENABLE_ALIGNED_QUOTE_TOKEN: 'enable-aligned-quote-token',

    // EVM-HyperCore Linking
    REQUEST_EVM_CONTRACT: 'request-evm-contract',
    FINALIZE_EVM_CONTRACT: 'finalize-evm-contract',
    FINALIZE_EVM_CONTRACT_COREWRITER: 'finalize-evm-contract-corewriter',

    // Post-Launch Management
    FREEZE_USER: 'freeze-user',
    REVOKE_FREEZE_PRIVILEGE: 'revoke-freeze-privilege',

    // Info & Queries
    SPOT_DEPLOY_STATE: 'spot-deploy-state',
    HIP_TOKEN: 'hip-token',
    IS_ACCOUNT_ACTIVATED: 'is-account-activated',
    GET_CORE_BALANCES: 'get-core-balances',
    LIST_SPOT_PAIRS: 'list-spot-pairs',
    SPOT_AUCTION_STATUS: 'spot-auction-status',
    LIST_QUOTE_ASSET: 'list-quote-asset',

    // Utilities
    TO_BRIDGE: 'to-bridge',

    // Additional logger-specific strings (when different from CLI command)
    SDK_HYPERLIQUID_COMPOSER: 'sdk-hyperliquid-composer',
    BASE_SIGNER: 'base-signer',
    ETHERS_SIGNER: 'ethers-signer',
    FORDEFI_SIGNER: 'fordefi-signer',
    FIREBLOCKS_SIGNER: 'fireblocks-signer',
    CORE_SPOT_DEPLOYMENT: 'core-spot-deployment',
    HIP_TOKEN_INFO: 'hip-token-info',
    GET_DEPLOY_STATE: 'get-deploy-state',
    SET_USER_GENESIS: 'setUserGenesis',
    GENESIS: 'genesis',
    SET_NO_HYPERLIQUIDITY: 'setNoHyperliquidity',
    REGISTER_TOKEN: 'register-token',
    INTO_ASSET_BRIDGE_ADDRESS: 'into-assetBridgeAddress',
} as const

// CLI Command Names - use the shared strings
export const CLI_COMMANDS = {
    // Setup & Environment
    SET_BLOCK: STRINGS.SET_BLOCK,

    // Core Spot Management
    CORE_SPOT: STRINGS.CORE_SPOT,

    // HIP-1 Deployment Workflow
    ENABLE_FREEZE_PRIVILEGE: STRINGS.ENABLE_FREEZE_PRIVILEGE,
    USER_GENESIS: STRINGS.USER_GENESIS,
    SET_GENESIS: STRINGS.SET_GENESIS,
    CREATE_SPOT_DEPLOYMENT: STRINGS.CREATE_SPOT_DEPLOYMENT,
    REGISTER_SPOT: STRINGS.REGISTER_SPOT,

    // Optional HIP-1 Features
    TRADING_FEE: STRINGS.TRADING_FEE,
    ENABLE_QUOTE_TOKEN: STRINGS.ENABLE_QUOTE_TOKEN,
    ENABLE_ALIGNED_QUOTE_TOKEN: STRINGS.ENABLE_ALIGNED_QUOTE_TOKEN,

    // EVM-HyperCore Linking
    REQUEST_EVM_CONTRACT: STRINGS.REQUEST_EVM_CONTRACT,
    FINALIZE_EVM_CONTRACT: STRINGS.FINALIZE_EVM_CONTRACT,
    FINALIZE_EVM_CONTRACT_COREWRITER: STRINGS.FINALIZE_EVM_CONTRACT_COREWRITER,

    // Post-Launch Management
    FREEZE_USER: STRINGS.FREEZE_USER,
    REVOKE_FREEZE_PRIVILEGE: STRINGS.REVOKE_FREEZE_PRIVILEGE,

    // Info & Queries
    SPOT_DEPLOY_STATE: STRINGS.SPOT_DEPLOY_STATE,
    HIP_TOKEN: STRINGS.HIP_TOKEN,
    IS_ACCOUNT_ACTIVATED: STRINGS.IS_ACCOUNT_ACTIVATED,
    GET_CORE_BALANCES: STRINGS.GET_CORE_BALANCES,
    LIST_SPOT_PAIRS: STRINGS.LIST_SPOT_PAIRS,
    SPOT_AUCTION_STATUS: STRINGS.SPOT_AUCTION_STATUS,
    LIST_QUOTE_ASSET: STRINGS.LIST_QUOTE_ASSET,

    // Utilities
    TO_BRIDGE: STRINGS.TO_BRIDGE,
} as const

// Logger Module Names - reuse shared strings where possible
export const LOGGER_MODULES = {
    // Main SDK logger
    SDK_HYPERLIQUID_COMPOSER: STRINGS.SDK_HYPERLIQUID_COMPOSER,

    // Signers
    BASE_SIGNER: STRINGS.BASE_SIGNER,
    ETHERS_SIGNER: STRINGS.ETHERS_SIGNER,
    FORDEFI_SIGNER: STRINGS.FORDEFI_SIGNER,
    FIREBLOCKS_SIGNER: STRINGS.FIREBLOCKS_SIGNER,

    // Setup & Environment
    SET_BLOCK: STRINGS.SET_BLOCK,

    // Core Spot Management
    CORE_SPOT_DEPLOYMENT: STRINGS.CORE_SPOT_DEPLOYMENT,
    HIP_TOKEN_INFO: STRINGS.HIP_TOKEN_INFO,
    GET_DEPLOY_STATE: STRINGS.GET_DEPLOY_STATE,

    // HIP-1 Deployment Workflow
    ENABLE_FREEZE_PRIVILEGE: STRINGS.ENABLE_FREEZE_PRIVILEGE,
    USER_GENESIS: STRINGS.USER_GENESIS,
    SET_USER_GENESIS: STRINGS.SET_USER_GENESIS,
    GENESIS: STRINGS.GENESIS,
    SET_GENESIS: STRINGS.SET_GENESIS,
    CREATE_SPOT_DEPLOYMENT: STRINGS.CREATE_SPOT_DEPLOYMENT,
    SET_NO_HYPERLIQUIDITY: STRINGS.SET_NO_HYPERLIQUIDITY,
    REGISTER_SPOT: STRINGS.REGISTER_SPOT,
    REGISTER_TRADING_SPOT: STRINGS.REGISTER_SPOT, // Reuse same string

    // Optional HIP-1 Features
    TRADING_FEE: STRINGS.TRADING_FEE,
    ENABLE_QUOTE_TOKEN: STRINGS.ENABLE_QUOTE_TOKEN,
    ENABLE_ALIGNED_QUOTE_TOKEN: STRINGS.ENABLE_ALIGNED_QUOTE_TOKEN,

    // EVM-HyperCore Linking
    REQUEST_EVM_CONTRACT: STRINGS.REQUEST_EVM_CONTRACT,
    FINALIZE_EVM_CONTRACT: STRINGS.FINALIZE_EVM_CONTRACT,
    REGISTER_TOKEN: STRINGS.REGISTER_TOKEN,
    FINALIZE_EVM_CONTRACT_COREWRITER: STRINGS.FINALIZE_EVM_CONTRACT_COREWRITER,

    // Post-Launch Management
    FREEZE_USER: STRINGS.FREEZE_USER,
    REVOKE_FREEZE_PRIVILEGE: STRINGS.REVOKE_FREEZE_PRIVILEGE,

    // Info & Queries
    LIST_SPOT_PAIRS: STRINGS.LIST_SPOT_PAIRS,
    SPOT_AUCTION_STATUS: STRINGS.SPOT_AUCTION_STATUS,
    LIST_QUOTE_ASSET: STRINGS.LIST_QUOTE_ASSET,

    // Utilities
    INTO_ASSET_BRIDGE_ADDRESS: STRINGS.INTO_ASSET_BRIDGE_ADDRESS,
} as const
