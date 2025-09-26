import { ContractTransaction } from 'ethers'
import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { createLogger } from '@layerzerolabs/io-devtools'
import { endpointIdToNetwork } from '@layerzerolabs/lz-definitions'

// Import LayerZero logging utilities
const logger = createLogger()

// Known error types for consistent error handling
enum KnownErrors {
    ERROR_GETTING_DEPLOYMENT = 'ERROR_GETTING_DEPLOYMENT',
    ERROR_QUOTING_READ_FEE = 'ERROR_QUOTING_READ_FEE',
    ERROR_SENDING_READ_REQUEST = 'ERROR_SENDING_READ_REQUEST',
}

// Known output types for consistent success messaging
enum KnownOutputs {
    SENT_READ_REQUEST = 'SENT_READ_REQUEST',
    TX_HASH = 'TX_HASH',
    EXPLORER_LINK = 'EXPLORER_LINK',
}

// Simple DebugLogger implementation for structured messaging
class DebugLogger {
    static printErrorAndFixSuggestion(errorType: KnownErrors, context: string) {
        logger.error(`❌ ${errorType}: ${context}`)
    }

    static printLayerZeroOutput(outputType: KnownOutputs, message: string) {
        logger.info(`✅ ${outputType}: ${message}`)
    }
}

// Get LayerZero scan link
function getLayerZeroScanLink(txHash: string, isTestnet = false): string {
    const baseUrl = isTestnet ? 'https://testnet.layerzeroscan.com' : 'https://layerzeroscan.com'
    return `${baseUrl}/tx/${txHash}`
}

// Get block explorer link (simplified version)
async function getBlockExplorerLink(networkName: string, txHash: string): Promise<string | undefined> {
    // This is a simplified version - in production you'd fetch from the metadata API
    const explorers: Record<string, string> = {
        'base-sepolia': 'https://sepolia.basescan.org',
        'arbitrum-sepolia': 'https://sepolia.arbiscan.io',
    }

    const explorer = explorers[networkName]
    return explorer ? `${explorer}/tx/${txHash}` : undefined
}

task('lz:oapp-read:read', 'Sends a read request to fetch data from a target contract on another chain')
    .addParam('targetContract', 'Target contract address to read from', undefined, types.string)
    .addParam('targetEid', 'Target chain endpoint ID', undefined, types.int)
    .addOptionalParam('options', 'Execution options (hex string)', '0x', types.string)
    .setAction(
        async (
            args: { targetContract: string; targetEid: number; options?: string },
            hre: HardhatRuntimeEnvironment
        ) => {
            logger.info(`Initiating read request from ${hre.network.name} to ${endpointIdToNetwork(args.targetEid)}`)
            logger.info(`Target contract: ${args.targetContract}`)
            logger.info(`Target EID: ${args.targetEid}`)

            // Get the signer
            const [signer] = await hre.ethers.getSigners()
            logger.info(`Using signer: ${signer.address}`)

            // Get the deployed ReadPublic contract
            let readPublicContract
            let contractAddress: string
            try {
                const readPublicDeployment = await hre.deployments.get('ReadPublic')
                contractAddress = readPublicDeployment.address
                readPublicContract = await hre.ethers.getContractAt('ReadPublic', contractAddress, signer)
                logger.info(`ReadPublic contract found at: ${contractAddress}`)
            } catch (error) {
                DebugLogger.printErrorAndFixSuggestion(
                    KnownErrors.ERROR_GETTING_DEPLOYMENT,
                    `Failed to get ReadPublic deployment on network: ${hre.network.name}`
                )
                throw error
            }

            // Prepare options (convert hex string to bytes if provided)
            const options = args.options || '0x'
            logger.info(`Execution options: ${options}`)

            // 1️⃣ Quote the read fee
            logger.info('Quoting fee for the read request...')
            let messagingFee
            try {
                messagingFee = await readPublicContract.quoteReadFee(args.targetContract, args.targetEid, options)
                logger.info(`  Native fee: ${hre.ethers.utils.formatEther(messagingFee.nativeFee)} ETH`)
                logger.info(`  LZ token fee: ${messagingFee.lzTokenFee.toString()} LZ`)
            } catch (error) {
                DebugLogger.printErrorAndFixSuggestion(
                    KnownErrors.ERROR_QUOTING_READ_FEE,
                    `For target: ${endpointIdToNetwork(args.targetEid)}, Contract: ${args.targetContract}`
                )
                throw error
            }

            // 2️⃣ Send the read request
            logger.info('Sending the read request transaction...')
            let tx: ContractTransaction
            try {
                tx = await readPublicContract.readData(args.targetContract, args.targetEid, options, {
                    value: messagingFee.nativeFee, // Pay the native fee
                })
                logger.info(`  Transaction hash: ${tx.hash}`)
            } catch (error) {
                DebugLogger.printErrorAndFixSuggestion(
                    KnownErrors.ERROR_SENDING_READ_REQUEST,
                    `For target: ${endpointIdToNetwork(args.targetEid)}, Contract: ${args.targetContract}`
                )
                throw error
            }

            // 3️⃣ Wait for confirmation
            logger.info('Waiting for transaction confirmation...')
            const receipt = await tx.wait()
            logger.info(`  Gas used: ${receipt.gasUsed.toString()}`)
            logger.info(`  Block number: ${receipt.blockNumber}`)

            // 4️⃣ Success messaging and links
            DebugLogger.printLayerZeroOutput(
                KnownOutputs.SENT_READ_REQUEST,
                `Successfully sent read request from ${hre.network.name} to ${endpointIdToNetwork(args.targetEid)}`
            )

            // Get and display block explorer link
            const explorerLink = await getBlockExplorerLink(hre.network.name, receipt.transactionHash)
            if (explorerLink) {
                DebugLogger.printLayerZeroOutput(
                    KnownOutputs.TX_HASH,
                    `Block explorer link for source chain ${hre.network.name}: ${explorerLink}`
                )
            }

            // Get and display LayerZero scan link
            const scanLink = getLayerZeroScanLink(
                receipt.transactionHash,
                args.targetEid >= 40_000 && args.targetEid < 50_000
            )
            DebugLogger.printLayerZeroOutput(
                KnownOutputs.EXPLORER_LINK,
                `LayerZero Scan link for tracking read request: ${scanLink}`
            )

            logger.info('')
            logger.info('📖 Read request sent! The data will be received and emitted in a DataReceived event.')
            logger.info('   Check the ReadPublic contract for the DataReceived event to see the result.')

            return {
                txHash: receipt.transactionHash,
                blockNumber: receipt.blockNumber,
                gasUsed: receipt.gasUsed.toString(),
                scanLink: scanLink,
                explorerLink: explorerLink,
            }
        }
    )
