import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { ChainType, endpointIdToChainType, endpointIdToNetwork } from '@layerzerolabs/lz-definitions'

import { EvmArgs, sendEvm } from '../evm/sendEvm'
import { SolanaArgs, sendSolana } from '../solana/sendSolana'

import { SendResult } from './types'
import { DebugLogger } from './utils'

interface MasterArgs {
    srcEid: number
    dstEid: number
    amount: string
    to: string
    oftAddress?: string
    oftProgramId?: string
    tokenProgram?: string
}

task('lz:oft:send', 'Send OFT tokens between chains')
    .addParam('srcEid', 'Source endpoint ID', undefined, types.int)
    .addParam('dstEid', 'Destination endpoint ID', undefined, types.int)
    .addParam('amount', 'Amount to send (human units)', undefined, types.string)
    .addParam('to', 'Recipient address', undefined, types.string)
    .addOptionalParam('oftAddress', 'Override the local OFT address', undefined, types.string)
    .addOptionalParam('oftProgramId', 'Solana only: override the OFT program ID', undefined, types.string)
    .addOptionalParam('tokenProgram', 'Solana token program', undefined, types.string)
    .setAction(async (args: MasterArgs, hre: HardhatRuntimeEnvironment) => {
        const chainType = endpointIdToChainType(args.srcEid)
        let result: SendResult
        if (chainType === ChainType.EVM) {
            result = await sendEvm(args as EvmArgs, hre)
        } else if (chainType === ChainType.SOLANA) {
            result = await sendSolana(args as SolanaArgs)
        } else {
            throw new Error(`Unsupported chain type: ${chainType}`)
        }

        DebugLogger.keyValue('src', endpointIdToNetwork(args.srcEid).network)
        DebugLogger.keyValue('tx', result.txHash)
        if (result.scanLink) DebugLogger.keyValue('scan', result.scanLink)
    })
