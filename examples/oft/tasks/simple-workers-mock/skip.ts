import { Contract } from 'ethers'
import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { createLogger } from '@layerzerolabs/io-devtools'
import { addressToBytes32 } from '@layerzerolabs/lz-v2-utilities'

const logger = createLogger()

interface SkipTaskArgs {
    srcEid: number
    srcOapp: string
    nonce: string
    receiver: string
}

task('lz:simple-workers:skip', 'Skip a stuck message on the destination chain (PERMANENT - cannot be undone!)')
    .addParam('srcEid', 'Source chain EID', undefined, types.int)
    .addParam('srcOapp', 'Source OApp address (hex)', undefined, types.string)
    .addParam('nonce', 'Nonce to skip (from error message)', undefined, types.string)
    .addParam('receiver', 'Receiver OApp address on this chain', undefined, types.string)
    .setAction(async (args: SkipTaskArgs, hre: HardhatRuntimeEnvironment) => {
        const { srcEid, srcOapp, nonce, receiver } = args
        const signer = (await hre.ethers.getSigners())[0]

        // Get EndpointV2 contract
        const endpointDep = await hre.deployments.get('EndpointV2')
        const endpointContract = new Contract(endpointDep.address, endpointDep.abi, signer)

        // Convert source OApp address to bytes32
        const srcOappB32 = addressToBytes32(srcOapp)

        logger.warn('\nWARNING: Skipping a message is PERMANENT and cannot be undone!')
        logger.warn('The skipped message and any tokens/value it contains will be permanently lost.')
        logger.warn(`\nYou are about to skip:`)
        logger.info(`  Source EID:   ${srcEid}`)
        logger.info(`  Source OApp:  ${srcOapp}`)
        logger.info(`  Receiver:     ${receiver}`)
        logger.info(`  Nonce:        ${nonce}`)
        logger.info(`  Endpoint:     ${endpointContract.address}`)

        // Add a delay to give user time to cancel if needed
        logger.warn('\nProceeding in 5 seconds... Press Ctrl+C to cancel')
        await new Promise((resolve) => setTimeout(resolve, 5000))

        try {
            // Call skip on the endpoint
            logger.info('\nCalling endpoint.skip()...')
            const tx = await endpointContract.skip(receiver, srcEid, srcOappB32, nonce)
            logger.info(`Transaction hash: ${tx.hash}`)

            const receipt = await tx.wait()
            logger.info(`Transaction confirmed in block: ${receipt.blockNumber}`)

            // Check for events
            const skipEvent = receipt.events?.find((e: any) => e.event === 'PacketSkipped')
            if (skipEvent) {
                logger.info('\nMessage successfully skipped!')
                logger.info(`  GUID: ${skipEvent.args?.guid}`)
            } else {
                logger.info('\nSkip transaction completed (no PacketSkipped event found)')
            }

            logger.warn('\nIMPORTANT: The skipped message is now permanently lost.')
            logger.info('You can now process subsequent messages in the queue.')
        } catch (error) {
            logger.error('Failed to skip message:', error)

            const errorMessage = error instanceof Error ? error.message : String(error)

            // Provide helpful context for common errors
            if (errorMessage.includes('invalid nonce')) {
                logger.error('\nThis nonce may have already been processed or skipped.')
                logger.error('Check the current inbound nonce on the endpoint.')
            } else if (errorMessage.includes('unauthorized')) {
                logger.error('\nYou may not have permission to skip messages.')
                logger.error('Only the OApp owner or endpoint owner can skip messages.')
            }

            throw error
        }
    })
