import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { createLogger } from '@layerzerolabs/io-devtools'
import { EndpointId, endpointIdToNetwork } from '@layerzerolabs/lz-definitions'

import { EvmArgs, sendEvm } from '../evm/sendEvm'
import { TronArgs, sendTron } from '../tron/sendTron'

import { SendResult } from './types'

const logger = createLogger()

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
        let result: SendResult

        if (args.oftAddress || args.oftProgramId) {
            logger.warn(
                `Using override OFT for network: ${endpointIdToNetwork(args.srcEid)}, OFT: ${args.oftAddress + (args.oftProgramId ? `, OFT program: ${args.oftProgramId}` : '')}`
            )
        }

        // route to the correct function based on the chain type
        if (args.srcEid === EndpointId.TRON_V2_MAINNET || args.srcEid === EndpointId.TRON_V2_TESTNET) {
            result = await sendTron(args as TronArgs)
        } else {
            result = await sendEvm(args as EvmArgs, hre)
        }

        logger.info(
            `Successfully sent ${args.amount} tokens from ${endpointIdToNetwork(args.srcEid)} to ${endpointIdToNetwork(args.dstEid)}`
        )

        // print the LayerZero Scan link
        logger.info(`LayerZero Scan link for tracking all cross-chain transaction details: ${result.scanLink}`)
    })
