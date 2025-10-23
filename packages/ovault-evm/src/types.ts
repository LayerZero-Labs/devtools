import { Chain as ViemChain } from 'viem'
import { OFTAbi } from './contracts/OFT'
import { OVaultComposerSyncAbi } from './contracts/OVaultComposerSync'
import { ERC4626_ABI } from './contracts/ERC4626'
import { OVaultComposerSyncNativeAbi } from './contracts/OVaultComposerSyncNative'

export enum OVaultSyncOperations {
    DEPOSIT = 'deposit',
    REDEEM = 'redeem',
}

export interface SendParamsInput {
    srcEid: number
    hubEid: number
    dstEid: number
    dstAddress: `0x${string}`
    walletAddress: `0x${string}`

    vaultAddress: `0x${string}`
    composerAddress: `0x${string}`

    // The Viem chain object for the hub chain. Require user to pass in the hub chain object so that
    // not every viem chain needs to be bundled with the SDK.
    hubChain: ViemChain

    // The Viem chain object for the source chain
    sourceChain: ViemChain

    // Deposit or redeem
    operation: OVaultSyncOperations

    // This is the amount of tokens to send
    amount: bigint

    dstAmount: bigint
    // This is the minimum amount of tokens to receive. If you are sending the OFT Asset,
    // then this is the minimum amount of shares to receive.
    minDstAmount: bigint

    slippage: number // How much slippage to allow for the redemption. This is a percentage, so 0.01 = 1%

    oftAddress: `0x${string}`
    tokenAddress: `0x${string}` // If a hex code equal to 0x0, then the native token is being sent

    // The gas limit for the hub chain. Only needed if the hub chain is not the same as the source chain.
    // Defaults to 375_000 for cross chain operations and 175_000 for same chain operations.
    hubLzComposeGasLimit?: bigint

    // The amount of extra buffer gas to add to the message fee calculation
    buffer?: number
}

export type GenerateOVaultSyncInputsProps = Omit<
    SendParamsInput,
    'dstAmount' | 'minDstAmount' | 'tokenAddress' | 'dstAddress' | 'hubChainSourceAmount'
> & {
    tokenAddress?: `0x${string}`
    dstAddress?: `0x${string}`
}

/**
 * The send parameters for the OVault. Pass this to the OFT or OVaultComposer to send the tokens.
 *
 * @typedef {Object} SendParams
 * @property {number} dstEid - The destination chain ID.
 * @property {`0x${string}`} to - The address of the destination contract.
 * @property {bigint} amountLD - The amount of tokens to send.
 * @property {bigint} minAmountLD - The minimum amount of tokens to receive.
 * @property {`0x${string}`} extraOptions - The extra options for the OVault.
 * @property {`0x${string}`} composeMsg - The compose message for the OVault.
 * @property {`0x${string}`} oftCmd - The OFT command for the OVault.
 */
export interface SendParams {
    dstEid: number
    to: `0x${string}`
    amountLD: bigint
    minAmountLD: bigint
    extraOptions: `0x${string}`
    composeMsg: `0x${string}`
    oftCmd: `0x${string}`
}

/**
 * The message fee for the OVault.
 *
 * @typedef {Object} MessageFee
 * @property {bigint} nativeFee - The native fee for the OVault.
 * @property {bigint} lzTokenFee - The LZ token fee for the OVault.
 */
export interface MessageFee {
    nativeFee: bigint
    lzTokenFee: bigint
}

/**
 * The inputs for the OVault.
 *
 * @typedef {Object} OVaultInputs
 * @property {MessageFee} messageFee - The message fee for the OVault.
 * @property {`0x${string}`} contractAddress - The address of the contract to call.
 * @property {Object} dstAmount - The amount of tokens to send.
 * @property {Object} approval - The approval parameters for the OVault. If undefined, then no approval is needed.
 * @property {Object} txArgs - The transaction arguments for the OVault.
 */
export type OVaultSyncInputs = {
    messageFee: MessageFee
    contractAddress: `0x${string}`
    messageValue: bigint
    dstAmount: {
        amount: bigint
        minAmount: bigint
    }
    approval?: {
        tokenAddress: `0x${string}`
        amount: bigint
        spender: `0x${string}`
    }
} & (
    | {
          txArgs: [SendParams, MessageFee, `0x${string}`]
          contractFunctionName: 'send'
          abi: typeof OFTAbi
      }
    | {
          txArgs: [bigint, SendParams, `0x${string}`]
          contractFunctionName: 'depositAndSend' | 'redeemAndSend' | 'depositNativeAndSend'
          abi: typeof OVaultComposerSyncAbi | typeof OVaultComposerSyncNativeAbi
      }
    | {
          txArgs: [bigint, `0x${string}`]
          contractFunctionName: 'deposit'
          abi: typeof ERC4626_ABI
      }
    | {
          txArgs: [bigint, `0x${string}`, `0x${string}`]
          contractFunctionName: 'redeem'
          abi: typeof ERC4626_ABI
      }
)

export enum OVaultTransactionStep {
    SOURCE_CHAIN_TRANSACTION = 'sourceChainTransaction',
    SOURCE_TO_HUB_LZ_TRANSACTION = 'sourceToHubLzTransaction',
    HUB_CHAIN_TRANSACTION = 'hubChainTransaction',
    HUB_TO_DST_LZ_TRANSACTION = 'hubToDstLzTransaction',
    DST_CHAIN_TRANSACTION = 'dstChainTransaction',
    COMPLETED = 'completed',
}

export enum OVaultFailureReason {
    UNKNOWN = 'unknown',
}

export interface OVaultTransactionStatus {
    step: OVaultTransactionStep

    // If the transaction failed, this will be set
    failureReason?: OVaultFailureReason

    // If the transaction was refunded, this will be set
    refunded?: boolean
}
