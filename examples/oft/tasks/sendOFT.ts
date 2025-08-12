//
import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { types as cliTypes, createGetHreByEid } from '@layerzerolabs/devtools-evm-hardhat'
import { ChainType, endpointIdToChainType, endpointIdToNetwork } from '@layerzerolabs/lz-definitions'

import { EvmArgs, sendEvm } from './sendEvm'
import { noncePreflightCheck, triggerProcessReceive } from './simple-workers-mock/utils/common'
import { SendResult } from './types'
import { DebugLogger, KnownOutputs, KnownWarnings, getBlockExplorerLink, getOftAddresses } from './utils'

// getOAppInfoByEid moved to ./utils

interface MasterArgs {
    srcEid: number
    dstEid: number
    amount: string
    to: string
    oappConfig: string
    /** Minimum amount to receive in case of custom slippage or fees (human readable units, e.g. "1.5") */
    minAmount?: string
    /** Array of lzReceive options as comma-separated values "gas,value" - e.g. --extra-lz-receive-options "200000,0" */
    extraLzReceiveOptions?: string[]
    /** Array of lzCompose options as comma-separated values "index,gas,value" - e.g. --extra-lz-compose-options "0,500000,0" */
    extraLzComposeOptions?: string[]
    /** Array of native drop options as comma-separated values "amount,recipient" - e.g. --extra-native-drop-options "1000000000000000000,0x1234..." */
    extraNativeDropOptions?: string[]
    /** Arbitrary bytes message to deliver alongside the OFT */
    composeMsg?: string
    /** EVM: 20-byte hex address */
    oftAddress?: string
    /** DEVELOPMENT ONLY: Enable SimpleDVN manual verification flow (not for mainnet use) */
    simpleWorkers?: boolean
}

task('lz:oft:send', 'Sends OFT tokens cross‐chain from EVM chains')
    .addParam('srcEid', 'Source endpoint ID', undefined, types.int)
    .addParam('dstEid', 'Destination endpoint ID', undefined, types.int)
    .addParam('amount', 'Amount to send (human readable units, e.g. "1.5")', undefined, types.string)
    .addParam('to', 'Recipient address (20-byte hex for EVM)', undefined, types.string)
    .addOptionalParam('oappConfig', 'Path to the LayerZero config file', 'layerzero.config.ts', types.string)
    .addOptionalParam(
        'minAmount',
        'Minimum amount to receive in case of custom slippage or fees (human readable units, e.g. "1.5")',
        undefined,
        types.string
    )
    .addOptionalParam(
        'extraLzReceiveOptions',
        'Array of lzReceive options as comma-separated values "gas,value"',
        undefined,
        cliTypes.csv
    )
    .addOptionalParam(
        'extraLzComposeOptions',
        'Array of lzCompose options as comma-separated values "index,gas,value"',
        undefined,
        cliTypes.csv
    )
    .addOptionalParam(
        'extraNativeDropOptions',
        'Array of native drop options as comma-separated values "amount,recipient"',
        undefined,
        cliTypes.csv
    )
    .addOptionalParam('composeMsg', 'Arbitrary bytes message to deliver alongside the OFT', undefined, types.string)
    .addOptionalParam(
        'oftAddress',
        'Override the source local deployment OFT address (20-byte hex for EVM)',
        undefined,
        types.string
    )
    .addFlag(
        'simpleWorkers',
        'DEVELOPMENT ONLY: Enable SimpleWorkers manual verification and execution flow after sending (not for mainnet use)'
    )
    .setAction(async (args: MasterArgs, hre: HardhatRuntimeEnvironment) => {
        const chainType = endpointIdToChainType(args.srcEid)
        let result: SendResult
        // SimpleWorkers-only context
        // These variables are only used when args.simpleWorkers is true.
        // They are populated once and reused across preflight (before send) and manual processing (after send).
        const getHreByEid = createGetHreByEid(hre)
        let dstHre: HardhatRuntimeEnvironment | null = null
        let srcHre: HardhatRuntimeEnvironment | null = null
        let srcOftAddress: string | null = null
        let dstOftAddress: string | null = null

        if (args.oftAddress) {
            DebugLogger.printWarning(
                KnownWarnings.USING_OVERRIDE_OFT,
                `For network: ${endpointIdToNetwork(args.srcEid)}, OFT: ${args.oftAddress}`
            )
        }

        // Only support EVM chains in this example
        if (chainType === ChainType.EVM) {
            // SimpleWorkers nonce preflight check before sending. This prevents initiating sends that will lead to InvalidNonce errors.
            if (args.simpleWorkers) {
                ;[dstHre, srcHre] = await Promise.all([getHreByEid(args.dstEid), getHreByEid(args.srcEid)])
                if (!dstHre || !srcHre) {
                    throw new Error('Failed to resolve Hardhat runtimes for src/dst EIDs')
                }
                const addrs = await getOftAddresses(
                    args.srcEid,
                    args.dstEid,
                    args.oappConfig,
                    (eid: number) => Promise.resolve(createGetHreByEid(hre)(eid)),
                    args.oftAddress
                )
                srcOftAddress = addrs.srcOft
                dstOftAddress = addrs.dstOft
                await noncePreflightCheck(dstHre, srcOftAddress, dstOftAddress, args.srcEid)
            }

            result = await sendEvm(args as EvmArgs, hre)
        } else {
            throw new Error(
                `The chain type ${chainType} is not supported in this OFT example. Only EVM chains are supported.`
            )
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

        // SimpleDVN processing (development only) - runs at the very end
        if (args.simpleWorkers) {
            if (!dstHre || !srcHre || !dstOftAddress || !srcOftAddress) {
                throw new Error('SimpleWorkers: Missing resolved hre or oft info')
            }
            await triggerProcessReceive(dstHre, srcHre, {
                srcEid: args.srcEid,
                dstEid: args.dstEid,
                to: args.to,
                amount: args.amount,
                outboundNonce: result.outboundNonce,
                srcOftAddress,
                dstOftAddress,
                dstContractName: undefined,
                extraOptions: result.extraOptions,
            })
        }
    })
