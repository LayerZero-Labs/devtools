import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { ChainType, endpointIdToChainType, endpointIdToNetwork } from '@layerzerolabs/lz-definitions'
import { Options } from '@layerzerolabs/lz-v2-utilities'

import { EvmArgs, sendEvm } from '../evm/sendEvm'
import { getSolanaDeployment } from '../solana'
import { SolanaArgs, sendSolana } from '../solana/sendSolana'
import { SPL_TOKEN_ACCOUNT_RENT_VALUE, SolanaTokenType, checkAssociatedTokenAccountExists } from '../solana/utils'

import { SendResult } from './types'
import { DebugLogger, KnownOutputs, KnownWarnings, getBlockExplorerLink } from './utils'

interface MasterArgs {
    srcEid: number
    dstEid: number
    amount: string
    to: string
    /** Minimum amount to receive in case of custom slippage or fees (human readable units, e.g. "1.5") */
    minAmount?: string
    /** Extra options for sending additional gas units to lzReceive, lzCompose, or receiver address */
    extraOptions?: string
    /** Arbitrary bytes message to deliver alongside the OFT */
    composeMsg?: string
    /** EVM: 20-byte hex; Solana: base58 PDA of the store */
    oftAddress?: string
    /** Solana only: override the OFT program ID (base58) */
    oftProgramId?: string
    tokenProgram?: string
    computeUnitPriceScaleFactor?: number
}

task('lz:oft:send', 'Sends OFT tokens cross‐chain from any supported chain')
    .addParam('srcEid', 'Source endpoint ID', undefined, types.int)
    .addParam('dstEid', 'Destination endpoint ID', undefined, types.int)
    .addParam('amount', 'Amount to send (human readable units, e.g. "1.5")', undefined, types.string)
    .addParam('to', 'Base58 recipient (Solana) or bytes20-encoded target (EVM)', undefined, types.string)
    .addOptionalParam(
        'minAmount',
        'Minimum amount to receive in case of custom slippage or fees (human readable units, e.g. "1.5")',
        undefined,
        types.string
    )
    .addOptionalParam(
        'extraOptions',
        'Extra options for sending additional gas units to lzReceive, lzCompose, or receiver address',
        undefined,
        types.string
    )
    .addOptionalParam(
        'oftAddress',
        'Override the source local deployment OFT address (20-byte hex for EVM, base58 PDA for Solana)',
        undefined,
        types.string
    )
    .addOptionalParam('oftProgramId', 'Solana only: override the OFT program ID (base58)', undefined, types.string)
    .addOptionalParam('tokenProgram', 'Solana Token Program pubkey', undefined, types.string)
    .addOptionalParam('computeUnitPriceScaleFactor', 'Solana compute unit price scale factor', 4, types.float)
    .setAction(async (args: MasterArgs, hre: HardhatRuntimeEnvironment) => {
        const srcChainType = endpointIdToChainType(args.srcEid)
        const dstChainType = endpointIdToChainType(args.dstEid)
        let result: SendResult

        if (args.oftAddress || args.oftProgramId) {
            DebugLogger.printWarning(
                KnownWarnings.USING_OVERRIDE_OFT,
                `For network: ${endpointIdToNetwork(args.srcEid)}, OFT: ${args.oftAddress + (args.oftProgramId ? `, OFT program: ${args.oftProgramId}` : '')}`
            )
        }

        // NOTE: the conditionalValue block below assumes that in layerzeroconfig.ts, in the SOLANA_ENFORCED_OPTIONS, you have set the value to 0
        // Setting value both in the SOLANA_ENFORCED_OPTIONS and in the conditionalValue block below will result in redundant value being sent
        let conditionalValue = 0
        // if sending to Solana, check if the recipient already has an associated token account
        // refer to https://docs.layerzero.network/v2/developers/solana/oft/account#setting-enforced-options-inbound-to-solana
        if (dstChainType === ChainType.SOLANA) {
            const solanaDeployment = getSolanaDeployment(args.dstEid)
            const recipient = args.to
            // note that there may still exist a race condition
            // if the first cross-chain send to a Solana recipient has not been executed yet, and a second send is initiated
            // then the second send will still attach the rent value since the ATA does not exist yet
            const { ataExists, tokenType } = await checkAssociatedTokenAccountExists({
                eid: args.dstEid,
                mint: solanaDeployment.mint,
                owner: recipient,
            })

            if (!ataExists && tokenType === SolanaTokenType.SPL) {
                conditionalValue = SPL_TOKEN_ACCOUNT_RENT_VALUE
            }
        }

        // throw if user specified extraOptions and we also need to set conditionalValue
        if (args.extraOptions && conditionalValue > 0) {
            throw new Error('extraOptions and conditionalValue cannot be set at the same time')
            // hint: do not pass in extraOptions via params
        }
        // if there's conditionalValue, we build the extraOptions
        if (conditionalValue > 0) {
            args.extraOptions = Options.newOptions().addExecutorLzReceiveOption(0, conditionalValue).toHex()
        }

        // route to the correct send function based on the source chain type
        if (srcChainType === ChainType.EVM) {
            result = await sendEvm(args as EvmArgs, hre)
        } else if (srcChainType === ChainType.SOLANA) {
            result = await sendSolana(args as SolanaArgs)
        } else {
            throw new Error(`The chain type ${srcChainType} is not implemented in sendOFT for this example`)
        }

        DebugLogger.printLayerZeroOutput(
            KnownOutputs.SENT_VIA_OFT,
            `Successfully sent ${args.amount} tokens from ${endpointIdToNetwork(args.srcEid)} to ${endpointIdToNetwork(args.dstEid)}`
        )
        // print the explorer link for the srcEid from metadata
        const explorerLink = await getBlockExplorerLink(args.srcEid, result.txHash)
        // if explorer link is available, print the tx hash link
        if (explorerLink) {
            DebugLogger.printLayerZeroOutput(
                KnownOutputs.TX_HASH,
                `Explorer link for source chain ${endpointIdToNetwork(args.srcEid)}: ${explorerLink}`
            )
        }
        // print the LayerZero Scan link from metadata
        DebugLogger.printLayerZeroOutput(
            KnownOutputs.EXPLORER_LINK,
            `LayerZero Scan link for tracking all cross-chain transaction details: ${result.scanLink}`
        )
    })
