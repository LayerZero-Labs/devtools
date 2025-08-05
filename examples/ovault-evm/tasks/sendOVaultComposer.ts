import path from 'path'

import { parseUnits } from 'ethers/lib/utils'
import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { OmniPointHardhat, createGetHreByEid } from '@layerzerolabs/devtools-evm-hardhat'
import { createLogger } from '@layerzerolabs/io-devtools'
import { ChainType, endpointIdToChainType, endpointIdToNetwork } from '@layerzerolabs/lz-definitions'
import { Options, addressToBytes32 } from '@layerzerolabs/lz-v2-utilities'

import { EvmArgs, sendEvm } from './sendEvm'
import { SendResult } from './types'
import { DebugLogger, KnownOutputs, getBlockExplorerLink } from './utils'

const logger = createLogger()

interface OVaultComposerArgs {
    srcEid: number // the source chain we're sending asset or share from
    dstEid: number // the destination chain we're receiving asset or share on
    amount: string // amount to send
    to: string // receiver wallet address
    tokenType: 'asset' | 'share' // Whether we're sending asset or share
    assetOappConfig?: string // Path to asset OFT config
    shareOappConfig?: string // Path to share OFT config (also used to detect hub)
    minAmount?: string
    lzReceiveGas?: number
    lzReceiveValue?: string
    lzComposeGas?: number
    lzComposeValue?: string
    oftAddress?: string // Override source OFT address
}

task('lz:ovault:send', 'Sends assets or shares through OVaultComposer with automatic composeMsg creation')
    .addParam('srcEid', 'Source endpoint ID', undefined, types.int)
    .addParam('dstEid', 'Destination endpoint ID', undefined, types.int)
    .addParam('amount', 'Amount to send (human readable units, e.g. "1.5")', undefined, types.string)
    .addParam('to', 'Recipient address (20-byte hex for EVM)', undefined, types.string)
    .addParam(
        'tokenType',
        'Token type to send: "asset" (to get shares) or "share" (to get assets)',
        undefined,
        types.string
    )
    .addOptionalParam('assetOappConfig', 'Path to the Asset OFT config file', 'layerzero.asset.config.ts', types.string)
    .addOptionalParam(
        'shareOappConfig',
        'Path to the Share OFT config file (to detect hub)',
        'layerzero.share.config.ts',
        types.string
    )
    .addOptionalParam(
        'minAmount',
        'Minimum amount to receive in case of custom slippage or fees (human readable units, e.g. "1.5")',
        undefined,
        types.string
    )
    .addOptionalParam('lzReceiveGas', 'Gas for lzReceive operation', undefined, types.int)
    .addOptionalParam('lzReceiveValue', 'Value for lzReceive operation (in wei)', undefined, types.string)
    .addOptionalParam(
        'lzComposeGas',
        'Gas for lzCompose operation (defaults: 175k for hub destination, 375k for cross-chain)',
        undefined,
        types.int
    )
    .addOptionalParam('lzComposeValue', 'Value for lzCompose operation (in wei)', undefined, types.string)
    .addOptionalParam(
        'oftAddress',
        'Override the source local deployment OFT address (20-byte hex for EVM)',
        undefined,
        types.string
    )
    .setAction(async (args: OVaultComposerArgs, hre: HardhatRuntimeEnvironment) => {
        // Validate tokenType
        if (args.tokenType !== 'asset' && args.tokenType !== 'share') {
            throw new Error(`Invalid tokenType "${args.tokenType}". Must be "asset" or "share"`)
        }

        // Auto-detect hub chain from share config
        const shareConfigPath = args.shareOappConfig || 'layerzero.share.config.ts'

        const layerZeroShareConfig = (await import(path.resolve('./', shareConfigPath))).default
        const { contracts } =
            typeof layerZeroShareConfig === 'function' ? await layerZeroShareConfig() : layerZeroShareConfig

        // Find the contract with ShareOFTAdapter (this is the hub)
        const hubContract = contracts.find(
            (c: { contract: OmniPointHardhat }) =>
                c.contract.contractName &&
                (c.contract.contractName.includes('ShareOFTAdapter') || c.contract.contractName.includes('Adapter'))
        )

        if (!hubContract) {
            throw new Error(
                `Could not find ShareOFTAdapter in ${shareConfigPath}. Make sure the hub chain contract name includes "Adapter"`
            )
        }

        const hubEid = hubContract.contract.eid
        logger.info(`Hub: ${endpointIdToNetwork(hubEid)}`)

        // Validate chain types
        if (endpointIdToChainType(args.srcEid) !== ChainType.EVM) {
            throw new Error(`Source EID ${args.srcEid} is not an EVM chain`)
        }
        if (endpointIdToChainType(hubEid) !== ChainType.EVM) {
            throw new Error(`HUB EID ${hubEid} is not an EVM chain`)
        }
        if (endpointIdToChainType(args.dstEid) !== ChainType.EVM) {
            throw new Error(`Destination EID ${args.dstEid} is not an EVM chain`)
        }

        const getHreByEid = createGetHreByEid(hre)
        const hubHre = await getHreByEid(hubEid)

        // Get OVaultComposer address from deployments on HUB
        const composerDeployment = await hubHre.deployments.get('MyOVaultComposer')
        const composerAddress = composerDeployment.address

        // Set gas limits based on whether destination is hub chain
        // If destination is hub, only local transfer is needed (no cross-chain messaging)
        const lzComposeGas =
            args.lzComposeGas ||
            (args.dstEid === hubEid
                ? 175000 // Lower gas for local transfer only
                : 395000) // Higher gas for cross-chain messaging

        if (!args.lzComposeGas) {
            logger.info(`Using ${args.dstEid === hubEid ? 'local transfer' : 'cross-chain'} gas limit: ${lzComposeGas}`)
        }

        const operationType = args.tokenType === 'asset' ? 'Deposit' : 'Redeem'
        const outputType = args.tokenType === 'asset' ? 'shares' : 'assets'
        const routeDescription =
            args.dstEid === hubEid
                ? `${endpointIdToNetwork(args.srcEid)} → ${endpointIdToNetwork(hubEid)}`
                : `${endpointIdToNetwork(args.srcEid)} → ${endpointIdToNetwork(hubEid)} → ${endpointIdToNetwork(args.dstEid)}`
        logger.info(`${operationType}: ${routeDescription} (${args.tokenType} → ${outputType})`)

        // Choose the appropriate config based on token type
        const configPath =
            args.tokenType === 'asset'
                ? args.assetOappConfig || 'layerzero.asset.config.ts'
                : args.shareOappConfig || 'layerzero.share.config.ts'

        // Get vault address and call preview functions to determine output amounts
        const vaultDeployment = await hubHre.deployments.get('MyERC4626')
        const vaultAddress = vaultDeployment.address
        const hubSigner = (await hubHre.ethers.getSigners())[0]

        // Get vault contract instance
        const ierc4626Artifact = await hubHre.artifacts.readArtifact('IERC4626')
        const vault = await hubHre.ethers.getContractAt(ierc4626Artifact.abi, vaultAddress, hubSigner)

        // Convert input amount to proper units and preview vault operation
        const inputAmountUnits = parseUnits(args.amount, 18) // Assuming 18 decimals
        let expectedOutputAmount: string
        let minAmountOut: string

        if (args.tokenType === 'asset') {
            // Depositing assets → getting shares
            try {
                const previewedShares = await vault.previewDeposit(inputAmountUnits)
                expectedOutputAmount = previewedShares.toString()
                logger.info(
                    `Vault preview: ${args.amount} ${args.tokenType} → ${(parseInt(expectedOutputAmount) / 1e18).toFixed(6)} ${outputType}`
                )
            } catch (error) {
                logger.warn(`Vault preview failed, using 1:1 estimate`)
                expectedOutputAmount = inputAmountUnits.toString()
            }
        } else {
            // Redeeming shares → getting assets
            try {
                const previewedAssets = await vault.previewRedeem(inputAmountUnits)
                expectedOutputAmount = previewedAssets.toString()
                logger.info(
                    `Vault preview: ${args.amount} ${args.tokenType} → ${(parseInt(expectedOutputAmount) / 1e18).toFixed(6)} ${outputType}`
                )
            } catch (error) {
                logger.warn(`Vault preview failed, using 1:1 estimate`)
                expectedOutputAmount = inputAmountUnits.toString()
            }
        }

        // Calculate min amount with slippage protection
        if (args.minAmount) {
            minAmountOut = parseUnits(args.minAmount, 18).toString()
        } else {
            minAmountOut = expectedOutputAmount
        }

        // Create the SendParam for second hop (hub → destination) - used for both quoting and composeMsg
        const secondHopSendParam = {
            dstEid: args.dstEid,
            to: addressToBytes32(args.to),
            amountLD: expectedOutputAmount, // Expected output from vault preview
            minAmountLD: minAmountOut,
            extraOptions: Options.newOptions().addExecutorLzReceiveOption(100000, 0).toHex(),
            composeMsg: '0x',
            oftCmd: '0x',
        }

        // Quote the second hop (hub → destination) using hub chain RPC to get accurate compose value
        // Only needed if the final destination is not the hub itself
        let lzComposeValue = args.lzComposeValue || '0'

        if (!args.lzComposeValue && args.dstEid !== hubEid) {
            // Determine which OFT to quote (opposite of what we're sending)
            const outputTokenConfig =
                args.tokenType === 'asset'
                    ? args.shareOappConfig || 'layerzero.share.config.ts' // Asset input → Share output
                    : args.assetOappConfig || 'layerzero.asset.config.ts' // Share input → Asset output

            const outputLayerZeroConfig = (await import(path.resolve('./', outputTokenConfig))).default
            const { contracts: outputContracts } =
                typeof outputLayerZeroConfig === 'function' ? await outputLayerZeroConfig() : outputLayerZeroConfig

            // Find the output OFT on hub chain
            const hubOutputContract = outputContracts.find(
                (c: { contract: OmniPointHardhat }) => c.contract.eid === hubEid
            )
            if (!hubOutputContract) {
                throw new Error(`No output OFT config found for hub EID ${hubEid} in ${outputTokenConfig}`)
            }

            // Get the output OFT address from hub chain deployments
            const outputOFTAddress = hubOutputContract.contract.contractName
                ? (await hubHre.deployments.get(hubOutputContract.contract.contractName)).address
                : hubOutputContract.contract.address || ''

            // IMPORTANT: Use hub chain RPC/signer for quoting the second hop
            const hubSigner = (await hubHre.ethers.getSigners())[0]
            const ioftArtifact = await hubHre.artifacts.readArtifact('IOFT')
            const outputOFT = await hubHre.ethers.getContractAt(ioftArtifact.abi, outputOFTAddress, hubSigner)

            try {
                // Quote using hub chain RPC with the expected output amount
                const quoteFee = await outputOFT.quoteSend(secondHopSendParam, false)
                lzComposeValue = quoteFee.nativeFee.toString()
                logger.info(
                    `Hub chain quoted hop fee: ${lzComposeValue} wei (${(parseInt(lzComposeValue) / 1e18).toFixed(6)} ETH)`
                )
            } catch (error) {
                logger.warn(`Quote failed, using default: 0.025 ETH`)
                lzComposeValue = '25000000000000000' // 0.025 ETH default
            }
        }

        // If destination is the hub, no cross-chain message is needed, so no compose value
        if (args.dstEid === hubEid) {
            lzComposeValue = '0'
            logger.info(`Destination is hub chain - no cross-chain compose needed`)
        }

        // Create the final composeMsg with SendParam and minMsgValue
        // This must match exactly: struct SendParam { uint32 dstEid; bytes32 to; uint256 amountLD; uint256 minAmountLD; bytes extraOptions; bytes composeMsg; bytes oftCmd; }
        const composeMsg = hubHre.ethers.utils.defaultAbiCoder.encode(
            ['tuple(uint32,bytes32,uint256,uint256,bytes,bytes,bytes)', 'uint256'],
            [
                [
                    secondHopSendParam.dstEid,
                    secondHopSendParam.to,
                    secondHopSendParam.amountLD,
                    secondHopSendParam.minAmountLD,
                    secondHopSendParam.extraOptions,
                    secondHopSendParam.composeMsg,
                    secondHopSendParam.oftCmd,
                ],
                lzComposeValue,
            ]
        )

        // Create lzCompose options with proper gas limits and quoted value
        const extraLzComposeOptions = ['0', lzComposeGas.toString(), lzComposeValue]

        // Create lzReceive options if provided
        const extraLzReceiveOptions = args.lzReceiveGas
            ? [args.lzReceiveGas.toString(), args.lzReceiveValue || '0']
            : undefined

        // Call the existing sendEvm function with proper parameters
        const evmArgs: EvmArgs = {
            srcEid: args.srcEid,
            dstEid: hubEid, // Send to HUB first
            amount: args.amount,
            to: composerAddress, // Send to composer
            oappConfig: configPath,
            minAmount: args.minAmount,
            extraLzReceiveOptions: extraLzReceiveOptions, // Optional lzReceive options
            extraLzComposeOptions: extraLzComposeOptions,
            extraNativeDropOptions: undefined,
            composeMsg: composeMsg,
            oftAddress: args.oftAddress,
        }

        const result: SendResult = await sendEvm(evmArgs, hre)

        const operationText = args.tokenType === 'asset' ? 'deposit (asset → shares)' : 'redeem (shares → assets)'
        const routeText =
            args.dstEid === hubEid
                ? `${endpointIdToNetwork(args.srcEid)} → ${endpointIdToNetwork(hubEid)}`
                : `${endpointIdToNetwork(args.srcEid)} → ${endpointIdToNetwork(hubEid)} → ${endpointIdToNetwork(args.dstEid)}`

        DebugLogger.printLayerZeroOutput(
            KnownOutputs.SENT_VIA_OFT,
            `Successfully sent ${args.amount} ${args.tokenType} for ${operationText}: ${routeText}`
        )

        // Print the explorer link for the srcEid
        const explorerLink = await getBlockExplorerLink(args.srcEid, result.txHash)
        if (explorerLink) {
            DebugLogger.printLayerZeroOutput(
                KnownOutputs.TX_HASH,
                `Explorer link for source chain ${endpointIdToNetwork(args.srcEid)}: ${explorerLink}`
            )
        }

        // Print the LayerZero Scan link
        DebugLogger.printLayerZeroOutput(
            KnownOutputs.EXPLORER_LINK,
            `LayerZero Scan link for tracking all cross-chain transaction details: ${result.scanLink}`
        )
    })
