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

export interface UserArgs extends BaseArgs {
    user: string
}

export interface OAppArgs extends BaseArgs {
    oappConfig?: string
}

// Combined argument interfaces
export interface DeploymentArgs extends TokenIndexArgs, PrivateKeyArgs {}

export interface EvmLinkingArgs extends DeploymentArgs, OAppArgs {}

export interface UserQueryArgs extends UserArgs {}

// Specific command argument interfaces
export interface SetBlockArgs extends PrivateKeyArgs {
    size: 'big' | 'small'
}

export interface CoreSpotDeploymentArgs extends TokenIndexArgs, OAppArgs {
    action: 'create' | 'get'
}

export interface UserGenesisArgs extends DeploymentArgs {
    action: '*' | 'userAndWei' | 'existingTokenAndWei' | 'blacklistUsers'
}

export interface TradingFeeArgs extends DeploymentArgs {
    share: string
}

export interface FreezeUserArgs extends DeploymentArgs {
    userAddress: string
    freeze: 'true' | 'false'
}

export interface SpotDeployStateArgs extends TokenIndexArgs {
    deployerAddress?: string
}

export interface GetCoreBalancesArgs extends UserQueryArgs {
    showZero: boolean
}

// Simple command args that only extend base interfaces
export interface GenesisArgs extends DeploymentArgs {}
export interface CreateSpotDeploymentArgs extends DeploymentArgs {}
export interface RegisterTradingSpotArgs extends DeploymentArgs {}
export interface EnableTokenFreezePrivilegeArgs extends DeploymentArgs {}
export interface RevokeTokenFreezePrivilegeArgs extends DeploymentArgs {}
export interface EnableTokenQuoteAssetArgs extends DeploymentArgs {}
export interface RequestEvmContractArgs extends EvmLinkingArgs {}
export interface FinalizeEvmContractArgs extends EvmLinkingArgs {}
export interface HipTokenInfoArgs extends TokenIndexArgs {}
export interface IsAccountActivatedArgs extends UserQueryArgs {}
export interface ListSpotPairsArgs extends TokenIndexArgs {}
export interface SpotAuctionStatusArgs extends BaseArgs {}
export interface IntoAssetBridgeAddressArgs extends TokenIndexArgs {}
