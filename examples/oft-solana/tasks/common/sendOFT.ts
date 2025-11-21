import { publicKey } from '@metaplex-foundation/umi'
import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { ChainType, endpointIdToChainType, endpointIdToNetwork } from '@layerzerolabs/lz-definitions'

import { EvmArgs, sendEvm } from '../evm/sendEvm'
import { deriveConnection, getSolanaDeployment } from '../solana'
import { SolanaArgs, sendSolana } from '../solana/sendSolana'
import { getMinimumValueForSendToSolana } from '../solana/utils'

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
    /** EVM: 20-byte hex; Solana: base58 PDA of the store (currently only relevant for sends to Solana) */
    dstOftAddress?: string
    /** Solana only: override the OFT program ID (base58) */
    oftProgramId?: string
    tokenProgram?: string
    computeUnitPriceScaleFactor?: number
    /** Solana only (so far): minimum value needed successful lzReceive on the destination chain */
    minimumLzReceiveValue?: number
    addressLookupTables?: string
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
    .addOptionalParam('composeMsg', 'Arbitrary bytes message to deliver alongside the OFT', undefined, types.string)
    .addOptionalParam(
        'oftAddress',
        'Override the source local deployment OFT address (20-byte hex for EVM, base58 PDA for Solana)',
        undefined,
        types.string
    )
    .addOptionalParam(
        'dstOftAddress',
        'Override the destination local deployment OFT address (20-byte hex for EVM, base58 PDA for Solana)',
        undefined,
        types.string
    )
    .addOptionalParam('oftProgramId', 'Solana only: override the OFT program ID (base58)', undefined, types.string)
    .addOptionalParam('tokenProgram', 'Solana Token Program pubkey', undefined, types.string)
    .addOptionalParam('computeUnitPriceScaleFactor', 'Solana compute unit price scale factor', 4, types.float)
    .addOptionalParam(
        'addressLookupTables',
        'Solana address lookup tables (comma separated base58 list)',
        undefined,
        types.string
    )
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

        let minimumLzReceiveValue = 0
        // If sending to Solana, compute minimum value needed for ATA creation
        if (dstChainType === ChainType.SOLANA) {
            const solanaDeployment = getSolanaDeployment(args.dstEid)
            const { connection, umi } = await deriveConnection(args.dstEid)
            // determines the absolute minimum value needed for an OFT send to Solana (based on ATA creation status)
            minimumLzReceiveValue = await getMinimumValueForSendToSolana({
                recipient: publicKey(args.to),
                mint: publicKey(args.dstOftAddress || solanaDeployment.mint),
                umi,
                connection,
            })
            args.minimumLzReceiveValue = minimumLzReceiveValue
        }

        // route to the correct send function based on the source chain type
        if (srcChainType === ChainType.EVM) {
            result = await sendEvm(args as EvmArgs, hre)
        } else if (srcChainType === ChainType.SOLANA) {
            result = await sendSolana({
                ...args,
                addressLookupTables: args.addressLookupTables ? args.addressLookupTables.split(',') : [],
            } as SolanaArgs)
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
