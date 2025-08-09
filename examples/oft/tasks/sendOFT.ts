import path from 'path'

import { Contract } from 'ethers'
import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { OmniPointHardhat, types as cliTypes, createGetHreByEid } from '@layerzerolabs/devtools-evm-hardhat'
import { ChainType, endpointIdToChainType, endpointIdToNetwork } from '@layerzerolabs/lz-definitions'

import { EvmArgs, sendEvm } from './sendEvm'
import { SimpleDvnMockTaskArgs } from './simple-workers-mock/utils/common'
import { processReceive } from './simple-workers-mock/utils/processReceive'
import { SendResult } from './types'
import { DebugLogger, KnownOutputs, KnownWarnings, getBlockExplorerLink } from './utils'

/**
 * Get OApp contract info by EID from LayerZero config
 */
async function getOAppInfoByEid(
    eid: number,
    oappConfig: string,
    hre: HardhatRuntimeEnvironment,
    overrideAddress?: string
): Promise<{ address: string; contractName?: string }> {
    if (overrideAddress) {
        return { address: overrideAddress }
    }

    const layerZeroConfig = (await import(path.resolve('./', oappConfig))).default
    const { contracts } = typeof layerZeroConfig === 'function' ? await layerZeroConfig() : layerZeroConfig
    const wrapper = contracts.find((c: { contract: OmniPointHardhat }) => c.contract.eid === eid)
    if (!wrapper) throw new Error(`No config for EID ${eid}`)

    const contractName = wrapper.contract.contractName
    const address = contractName ? (await hre.deployments.get(contractName)).address : wrapper.contract.address || ''

    return { address, contractName }
}

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
    simpleDvn?: boolean
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
        'Array of extra lzReceive options in format "gas,value" (e.g. ["200000,0", "100000,1000000000000000000"])',
        undefined,
        cliTypes.csv
    )
    .addOptionalParam(
        'extraLzComposeOptions',
        'Array of extra lzCompose options in format "index,gas,value" (e.g. ["0,500000,0", "1,300000,1000000000000000000"])',
        undefined,
        cliTypes.csv
    )
    .addOptionalParam(
        'extraNativeDropOptions',
        'Array of extra native drop options in format "amount,recipient" (e.g. ["1000000000000000000,0x1234..."])',
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
        'simpleDvn',
        'DEVELOPMENT ONLY: Enable SimpleDVN manual verification flow after sending (not for mainnet use)'
    )
    .setAction(async (args: MasterArgs, hre: HardhatRuntimeEnvironment) => {
        const chainType = endpointIdToChainType(args.srcEid)
        let result: SendResult

        if (args.oftAddress) {
            DebugLogger.printWarning(
                KnownWarnings.USING_OVERRIDE_OFT,
                `For network: ${endpointIdToNetwork(args.srcEid)}, OFT: ${args.oftAddress}`
            )
        }

        // Only support EVM chains in this example
        if (chainType === ChainType.EVM) {
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
        if (args.simpleDvn) {
            console.log('\n🧪 SimpleDVN Development Mode Enabled')
            console.log('⚠️  WARNING: This is for development/testing only. Do NOT use on mainnet.')

            const getHreByEid = createGetHreByEid(hre)
            const dstHre = await getHreByEid(args.dstEid)
            const signer = (await dstHre.ethers.getSigners())[0]

            // Get required contracts on destination chain
            const dvnDep = await dstHre.deployments.get('SimpleDVNMock')
            const dvnContract = new Contract(dvnDep.address, dvnDep.abi, signer)

            // Get destination OFT contract info from config
            const dstOftInfo = await getOAppInfoByEid(args.dstEid, args.oappConfig, dstHre, args.oftAddress)
            const dstOftContract = new Contract(
                dstOftInfo.address,
                await dstHre.artifacts.readArtifact('IOFT').then((a) => a.abi),
                signer
            )

            const endpointDep = await dstHre.deployments.get('EndpointV2')
            const endpointContract = new Contract(endpointDep.address, endpointDep.abi, signer)

            // Get source OApp info from config
            const srcHre = await getHreByEid(args.srcEid)
            const srcOftInfo = await getOAppInfoByEid(args.srcEid, args.oappConfig, srcHre, args.oftAddress)

            const processArgs: SimpleDvnMockTaskArgs = {
                srcEid: args.srcEid,
                dstEid: args.dstEid,
                srcOapp: srcOftInfo.address,
                nonce: result.outboundNonce,
                toAddress: args.to,
                amount: args.amount,
                dstContractName: dstOftInfo.contractName,
            }

            await processReceive(dvnContract, dstOftContract, endpointContract, processArgs)
        }
    })
