/**
 * Type definitions for CLI command arguments
 * These replace the `any` types used throughout the command functions
 */

import { LogLevel } from '@layerzerolabs/io-devtools'

// Base argument interfaces
export interface BaseArgs {
    network: 'mainnet' | 'testnet'
    logLevel: LogLevel
}

export interface TokenIndexArgs extends BaseArgs {
    tokenIndex: string
}

export interface PrivateKeyArgs extends BaseArgs {
    privateKey?: string
}

export interface FordefiArgs extends BaseArgs {
    fordefiApiUrl?: string
    fordefiAccessToken?: string
    fordefiVaultId?: string
    fordefiChain?: string
}

export interface UserArgs extends BaseArgs {
    user: string
}

// Specific command argument interfaces
export interface SetBlockArgs extends PrivateKeyArgs {
    size: 'big' | 'small'
    ci?: boolean
}

export interface CoreSpotDeploymentArgs extends TokenIndexArgs {
    action: 'create' | 'get'
}

export interface UserGenesisArgs extends TokenIndexArgs, PrivateKeyArgs {
    action: '*' | 'userAndWei' | 'existingTokenAndWei' | 'blacklistUsers'
}

export interface TradingFeeArgs extends TokenIndexArgs, PrivateKeyArgs {
    share: string
}

export interface FreezeUserArgs extends TokenIndexArgs, PrivateKeyArgs {
    userAddress: string
    freeze: 'true' | 'false'
}

export interface SpotDeployStateArgs extends TokenIndexArgs {
    deployerAddress?: string
}

export interface GetCoreBalancesArgs extends UserArgs {
    showZero: boolean
}

export interface ListQuoteAssetArgs extends BaseArgs {
    filterTokenIndex?: string
}

// Simple command args - using concrete interfaces instead of empty extends
export interface GenesisArgs extends TokenIndexArgs, PrivateKeyArgs {}
export interface CreateSpotDeploymentArgs extends TokenIndexArgs, PrivateKeyArgs {}
export interface RegisterTradingSpotArgs extends TokenIndexArgs, PrivateKeyArgs {}
export interface EnableTokenFreezePrivilegeArgs extends TokenIndexArgs, PrivateKeyArgs {}
export interface RevokeTokenFreezePrivilegeArgs extends TokenIndexArgs, PrivateKeyArgs {}
export interface EnableTokenQuoteAssetArgs extends TokenIndexArgs, PrivateKeyArgs {}
export interface EnableTokenAlignedQuoteAssetArgs extends TokenIndexArgs, PrivateKeyArgs {}
export interface RequestEvmContractArgs extends TokenIndexArgs, PrivateKeyArgs {}
export interface FinalizeEvmContractArgs extends TokenIndexArgs, PrivateKeyArgs {}
export interface FinalizeEvmContractCorewriterArgs extends TokenIndexArgs {
    nonce: string
}
