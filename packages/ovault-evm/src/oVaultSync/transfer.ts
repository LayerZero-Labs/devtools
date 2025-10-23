import { createPublicClient, encodeAbiParameters, hexToBigInt, http, pad } from 'viem'
import { OFTAbi } from '../contracts/OFT'
import { OVaultComposerSyncAbi } from '../contracts/OVaultComposerSync'
import { ERC4626_ABI } from '../contracts/ERC4626'
import { Options } from '@layerzerolabs/lz-v2-utilities'
import { ERC20Abi } from '../contracts/ERC20'
import {
    OVaultSyncInputs,
    SendParams,
    SendParamsInput,
    GenerateOVaultSyncInputsProps,
    OVaultSyncOperations,
} from '../types'
import { OVaultComposerSyncNativeAbi } from '../contracts/OVaultComposerSyncNative'

export class OVaultSyncMessageBuilder {
    static async buildComposeArgument(input: SendParamsInput, messageFee: bigint) {
        // For the default OVault, the compose argument is just the hub to dst chain send params
        // However, if you are using a custom OVault, you can have a custom compose argument
        return encodeAbiParameters(
            [
                {
                    type: 'tuple',
                    name: 'sendParams',
                    components: [
                        { name: 'dstEid', type: 'uint32' },
                        { name: 'to', type: 'bytes32' },
                        { name: 'amountLD', type: 'uint256' },
                        { name: 'minAmountLD', type: 'uint256' },
                        { name: 'extraOptions', type: 'bytes' },
                        { name: 'composeMsg', type: 'bytes' },
                        { name: 'oftCmd', type: 'bytes' },
                    ],
                },
                {
                    type: 'uint256',
                    name: 'minMsgValue',
                },
            ],
            [await this.buildHubToDstChainSendParams(input), messageFee]
        )
    }

    /**
     * Build the send params for the hub chain to the dst chain.
     *
     * @param input - The input parameters for the OVault.
     * @returns The send params for the hub chain to the dst chain.
     */
    static async buildHubToDstChainSendParams(input: SendParamsInput) {
        const { dstEid, dstAddress, dstAmount, minDstAmount } = input

        // This is for a basic OFT send, so the enforced options should be enough
        const options = Options.newOptions()
        return {
            dstEid: dstEid,
            to: pad(dstAddress, { size: 32 }),
            amountLD: dstAmount,
            minAmountLD: minDstAmount,
            extraOptions: options.toHex() as `0x${string}`,
            composeMsg: '0x' as `0x${string}`,
            oftCmd: '0x' as `0x${string}`,
        }
    }

    /**
     * Quote the amount of shares or assets that will be received from the OVault.
     *
     * @param input - The input parameters for the OVault.
     * @returns The amount of shares or assets that will be received from the OVault.
     */
    static async quoteOVaultOutput(input: GenerateOVaultSyncInputsProps): Promise<{
        dstAmount: bigint
        minDstAmount: bigint
    }> {
        const { operation, vaultAddress, hubChain, slippage, tokenAddress, oftAddress } = input

        const client = createPublicClient({
            chain: hubChain,
            transport: http(),
        })

        const sourceAmount = await this.getOutputAmount({
            ...input,
            dstAmount: 0n,
            minDstAmount: 0n,
            dstAddress: input.walletAddress,
            tokenAddress: tokenAddress ?? oftAddress,
        })

        const outputAmount = await client.readContract({
            address: vaultAddress,
            abi: ERC4626_ABI,
            functionName: operation === OVaultSyncOperations.DEPOSIT ? 'previewDeposit' : 'previewRedeem',
            args: [sourceAmount],
        })

        if (slippage < 0.001) {
            throw new Error('Slippage must be greater than 0.001(0.1%)')
        }

        const slippageAmount = (outputAmount * BigInt(Number(slippage.toFixed(3)) * 1000)) / 1000n

        return {
            dstAmount: outputAmount,
            minDstAmount: outputAmount - slippageAmount,
        }
    }

    /**
     * Calculate the message fee for the hub chain. This is the fee that it costs to send a message from the hub chain to the dst chain.
     *
     * @param input - The input parameters for the OVault.
     * @param useWalletAddress
     * @returns The message fee for the hub chain.
     */
    static async calculateHubChainFee(input: SendParamsInput, useWalletAddress = true) {
        const { operation, amount, composerAddress, hubChain, dstEid, hubEid, vaultAddress, buffer } = input

        // If the dst chain is the same as the hub chain, then we don't need to calculate the fee
        // as we are already on the hub chain, so "send" on the OFT will not be called.
        if (dstEid === hubEid) {
            return {
                nativeFee: 0n,
                lzTokenFee: 0n,
            }
        }

        const client = createPublicClient({
            chain: hubChain,
            transport: http(),
        })

        const hubSendParams = await this.buildHubToDstChainSendParams(input)
        const [shareOftAddress, assetOftAddress] = await Promise.all([
            client.readContract({
                address: composerAddress,
                abi: OVaultComposerSyncAbi,
                functionName: 'SHARE_OFT',
            }),
            client.readContract({
                address: composerAddress,
                abi: OVaultComposerSyncAbi,
                functionName: 'ASSET_OFT',
            }),
        ])

        // If it is a cross chain request, we need to use the vault address or the share OFT address as the wallet
        // address might not have any shares or assets yet. If it is a same chain request, then we can use the wallet address.
        const fromAddress = useWalletAddress
            ? input.walletAddress
            : operation === OVaultSyncOperations.DEPOSIT
              ? vaultAddress
              : shareOftAddress

        const quote = await client.readContract({
            address: composerAddress,
            abi: OVaultComposerSyncAbi,
            functionName: 'quoteSend',
            args: [
                fromAddress,
                // This is the target OFT
                operation === OVaultSyncOperations.DEPOSIT ? shareOftAddress : assetOftAddress,
                amount,
                hubSendParams,
            ],
        })

        return {
            nativeFee: this.increaseByBuffer(quote.nativeFee, buffer),
            lzTokenFee: this.increaseByBuffer(quote.lzTokenFee, buffer),
        }
    }

    static async getMessageFee(sendParams: SendParams, input: SendParamsInput) {
        const { oftAddress, sourceChain, srcEid, hubEid, buffer } = input

        const client = createPublicClient({
            chain: sourceChain,
            transport: http(),
        })

        // If the src chain is the same as the hub chain, then the way to calculate the message fee is the same
        // as calculating the hub chain fee as we are already on the hub chain.
        if (srcEid === hubEid) {
            return this.calculateHubChainFee(input, true)
        }

        // If we are not on the hub chain, then we need to call the OFT's quoteSend function to get the message fee.
        const messageFee = await client.readContract({
            address: oftAddress,
            abi: OFTAbi,
            functionName: 'quoteSend',
            args: [sendParams as never, false],
        })

        return {
            nativeFee: this.increaseByBuffer(messageFee.nativeFee, buffer),
            lzTokenFee: this.increaseByBuffer(messageFee.lzTokenFee, buffer),
        }
    }

    static increaseByBuffer(amount: bigint, buffer: number = 0) {
        if (!buffer || buffer <= 0) {
            return amount
        }

        const flatNumber = BigInt((buffer * 100).toFixed(0))

        const bufferAmount = (amount * flatNumber) / 100n
        return amount + bufferAmount
    }

    static async getOutputAmount(input: SendParamsInput) {
        const { sourceChain, oftAddress, amount, hubEid, composerAddress } = input
        const client = createPublicClient({
            chain: sourceChain,
            transport: http(),
        })

        const sendParams = {
            // If the src chain is not the same as the hub chain, then the first message will be to the hub chain
            // so we need to set the dstEid to the hub chain EID
            dstEid: hubEid,
            to: pad(composerAddress, { size: 32 }),
            amountLD: amount,
            minAmountLD: 0n,
            extraOptions: Options.newOptions().toHex() as `0x${string}`,
            composeMsg: '0x' as `0x${string}`,
            oftCmd: '0x' as `0x${string}`,
        }

        const outputAmount = await client.readContract({
            address: oftAddress,
            abi: OFTAbi,
            functionName: 'quoteOFT',
            args: [sendParams],
        })

        return outputAmount[2].amountReceivedLD
    }

    static async buildSendParams(input: SendParamsInput) {
        const { amount, srcEid, dstEid, composerAddress, hubEid, dstAmount, minDstAmount, tokenAddress, slippage } =
            input

        const options = Options.newOptions()

        const srcIsHubChain = srcEid === hubEid
        const dstIsHubChain = dstEid === hubEid

        if (srcIsHubChain) {
            return await this.buildHubToDstChainSendParams(input)
        }

        // If the src chain is not the same as the hub chain, then the first message will be an LzCompose
        // so we need to add the executor option
        const hubMessageFee = await this.calculateHubChainFee(
            {
                ...input,
                dstAmount,
                minDstAmount,
            },
            false
        )

        const gasLimit = input.hubLzComposeGasLimit ?? (dstIsHubChain ? 175_000n : 375_000n)
        options.addExecutorComposeOption(0, gasLimit, hubMessageFee.nativeFee)

        let minAmountLD = amount // If it's an OFT transfer there should be no slippage

        if (hexToBigInt(tokenAddress) === 0n) {
            // If sending native tokens, we need to account for slippage
            const amountDst = await this.getOutputAmount(input)
            const slippageAmount = (amountDst * BigInt(Number(slippage.toFixed(3)) * 1000)) / 1000n
            minAmountLD = amountDst - slippageAmount
        }

        return {
            // If the src chain is not the same as the hub chain, then the first message will be to the hub chain
            // so we need to set the dstEid to the hub chain EID
            dstEid: hubEid,
            to: pad(composerAddress, { size: 32 }),
            amountLD: amount,
            minAmountLD: minAmountLD,
            extraOptions: options.toHex() as `0x${string}`,
            composeMsg: await this.buildComposeArgument(input, hubMessageFee.nativeFee),
            oftCmd: '0x' as `0x${string}`,
        }
    }

    static async buildApproval(input: SendParamsInput) {
        const {
            tokenAddress,
            sourceChain,
            composerAddress,
            srcEid,
            hubEid,
            dstEid,
            amount,
            walletAddress,
            vaultAddress,
        } = input

        // If we are sending from a spoke chain we don't need to approve. This is because we will be calling "send", which is a function
        // on the OFT. The OFT is the spender in this case, so no approval is needed.
        if (srcEid !== hubEid) {
            return
        }

        const useVault = srcEid === hubEid && dstEid === hubEid
        const spender = useVault ? vaultAddress : composerAddress

        if (tokenAddress === spender) {
            return
        }

        if (hexToBigInt(tokenAddress) === 0n) {
            // If the token address is 0x0, then we are sending native tokens, so no approval is needed
            return
        }

        const client = createPublicClient({
            chain: sourceChain,
            transport: http(),
        })

        const allowance = await client.readContract({
            address: tokenAddress,
            abi: ERC20Abi,
            functionName: 'allowance',
            args: [walletAddress, spender],
        })

        if (allowance >= amount) {
            // We have enough allowance, so we don't need to approve
            return
        }

        return {
            tokenAddress,
            amount,
            spender,
        }
    }

    /**
     * Generate the inputs for the OVault.
     *
     * @param input - The input parameters for the OVault.
     * @returns Inputs to call contracts to perform Deposit or Redeem on the OVault.
     *
     */
    static async generateOVaultInputs(input: GenerateOVaultSyncInputsProps): Promise<OVaultSyncInputs> {
        const {
            srcEid,
            hubEid: hubEid,
            operation,
            amount,
            dstAddress,
            walletAddress: refundAddress,
            tokenAddress,
            composerAddress,
            oftAddress,
            dstEid,
            vaultAddress,
        } = input

        const outputAmount = await this.quoteOVaultOutput(input)

        const fullInputParams = {
            ...input,
            dstAmount: outputAmount.dstAmount,
            minDstAmount: outputAmount.minDstAmount,
            tokenAddress: tokenAddress ?? oftAddress,
            dstAddress: dstAddress ?? refundAddress,
        }

        const sendParams = await this.buildSendParams(fullInputParams)
        const messageFee = await this.getMessageFee(sendParams, fullInputParams)

        const srcIsHubChain = srcEid === hubEid
        const dstIsHubChain = dstEid === hubEid

        const isNativeToken = hexToBigInt(fullInputParams.tokenAddress) === 0n

        // If the tokenAddress is 0x0, then we are sending native tokens, so we need to add the amount to the message value
        let additionalNative = 0n
        if (isNativeToken) {
            additionalNative += amount
        }

        if (srcIsHubChain && dstIsHubChain && !isNativeToken) {
            if (operation === OVaultSyncOperations.DEPOSIT) {
                return {
                    messageFee,
                    messageValue: messageFee.nativeFee + additionalNative,
                    dstAmount: {
                        amount: outputAmount.dstAmount,
                        minAmount: outputAmount.minDstAmount,
                    },
                    txArgs: [amount, dstAddress ?? refundAddress],
                    contractFunctionName: 'deposit',
                    contractAddress: vaultAddress,
                    abi: ERC4626_ABI,
                    approval: await this.buildApproval(fullInputParams),
                }
            }

            return {
                messageFee,
                messageValue: messageFee.nativeFee + additionalNative,
                dstAmount: {
                    amount: outputAmount.dstAmount,
                    minAmount: outputAmount.minDstAmount,
                },
                txArgs: [amount, dstAddress ?? refundAddress, refundAddress],
                contractFunctionName: 'redeem',
                contractAddress: vaultAddress,
                abi: ERC4626_ABI,
                approval: await this.buildApproval(fullInputParams),
            }
        }

        if (!srcIsHubChain) {
            return {
                messageFee,
                messageValue: messageFee.nativeFee + additionalNative,
                dstAmount: {
                    amount: outputAmount.dstAmount,
                    minAmount: outputAmount.minDstAmount,
                },
                txArgs: [sendParams, messageFee, refundAddress],
                contractFunctionName: 'send',
                contractAddress: oftAddress,
                abi: OFTAbi,
            }
        }

        const depositOperation = isNativeToken ? 'depositNativeAndSend' : 'depositAndSend'

        return {
            messageFee,
            messageValue: messageFee.nativeFee + additionalNative,
            dstAmount: {
                amount: outputAmount.dstAmount,
                minAmount: outputAmount.minDstAmount,
            },
            approval: await this.buildApproval(fullInputParams),
            txArgs: [amount, sendParams, refundAddress ?? dstAddress],
            contractFunctionName: operation === OVaultSyncOperations.DEPOSIT ? depositOperation : 'redeemAndSend',
            contractAddress: composerAddress,
            abi: isNativeToken ? OVaultComposerSyncNativeAbi : OVaultComposerSyncAbi,
        }
    }
}
