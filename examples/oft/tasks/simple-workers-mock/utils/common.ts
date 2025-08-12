import { Contract, ethers } from 'ethers'

import { ExecutorNativeDropOption, Options, addressToBytes32 } from '@layerzerolabs/lz-v2-utilities'

import { DebugLogger } from '../../utils'

import type { HardhatRuntimeEnvironment } from 'hardhat/types'

export interface SimpleDvnMockTaskArgs {
    srcEid: number
    srcOapp: string
    nonce: string
    toAddress: string
    amount: string
    dstEid: number
    dstContractName?: string
    extraOptions?: string // Add support for extra options containing native drops
}

export interface ProcessedMessage {
    srcOAppB32: string
    toB32: string
    localOappB32: string
    message: string
    amountUnits: ethers.BigNumber
    sharedDecimals: number
    localOapp: string
    nativeDrops: Array<{ recipient: string; amount: string }> // Add native drops info
}

/**
 * Process message parameters and build the message payload
 */
export async function processMessage(dstOftContract: Contract, args: SimpleDvnMockTaskArgs): Promise<ProcessedMessage> {
    const { srcOapp, toAddress, amount, extraOptions } = args

    const localOapp = dstOftContract.address

    // Get shared decimals from destination OFT contract
    const sharedDecimals: number = await dstOftContract.sharedDecimals()

    // Parse amount using shared decimals
    const amountUnits = ethers.utils.parseUnits(amount, sharedDecimals)

    // Format addresses to bytes32
    const srcOAppB32 = addressToBytes32(srcOapp) as unknown as string
    const toB32 = addressToBytes32(toAddress) as unknown as string
    const localOappB32 = addressToBytes32(localOapp) as unknown as string

    // Build OFT message payload - only bytes32 (to) and uint64 (amount)
    const message = ethers.utils.solidityPack(['bytes32', 'uint64'], [toB32, amountUnits])

    // Extract native drop information from extraOptions if available
    const nativeDrops: Array<{ recipient: string; amount: string }> = []

    if (extraOptions && extraOptions !== '0x' && extraOptions.length > 2) {
        try {
            // Parse the options using LayerZero's Options utility
            const options = Options.fromOptions(extraOptions)
            const nativeDropOptions: ExecutorNativeDropOption = options.decodeExecutorNativeDropOption()

            if (nativeDropOptions) {
                // The ExecutorNativeDropOption can be an array or a single object
                const dropArray = Array.isArray(nativeDropOptions) ? nativeDropOptions : [nativeDropOptions]

                // Convert the decoded options to our format
                for (const drop of dropArray) {
                    if (drop && drop.receiver && drop.amount) {
                        // Convert bytes32 receiver to proper address format
                        let receiverAddress = drop.receiver.toString()
                        if (receiverAddress.length === 66 && receiverAddress.startsWith('0x')) {
                            // If it's bytes32 (66 chars), convert to address (42 chars)
                            receiverAddress = '0x' + receiverAddress.slice(-40)
                        }

                        nativeDrops.push({
                            recipient: receiverAddress,
                            amount: drop.amount.toString(),
                        })
                    }
                }
            }
        } catch (error) {
            console.warn('Failed to parse native drops from extraOptions:', error)
            // Fallback: no native drops if parsing fails
        }
    }

    return {
        srcOAppB32,
        toB32,
        localOappB32,
        message,
        amountUnits,
        sharedDecimals,
        localOapp,
        nativeDrops,
    }
}

/**
 * Log task information
 */
export function logTaskInfo(
    operation: string,
    args: SimpleDvnMockTaskArgs,
    processed: ProcessedMessage,
    extraInfo?: Record<string, unknown>
) {
    const { srcEid, srcOapp, nonce, toAddress, amount, dstEid } = args
    const { amountUnits, sharedDecimals, localOapp, nativeDrops } = processed

    console.log(`\nCalling ${operation}:`)
    console.log(`  srcEid:       ${srcEid}`)
    console.log(`  srcOApp:      ${srcOapp}`)
    console.log(`  nonce:        ${nonce}`)
    console.log(`  toAddress:    ${toAddress}`)
    console.log(`  amount:       ${amount} (${amountUnits.toString()} units, ${sharedDecimals} decimals)`)
    console.log(`  dstEid:       ${dstEid}`)
    console.log(`  localOApp:    ${localOapp}`)

    if (nativeDrops.length > 0) {
        console.log(`  nativeDrops:  ${nativeDrops.length} drop(s)`)
        nativeDrops.forEach((drop, index) => {
            console.log(`    [${index}] ${drop.amount} wei -> ${drop.recipient}`)
        })
    }

    if (extraInfo) {
        Object.entries(extraInfo).forEach(([key, value]) => {
            console.log(`  ${key}:${' '.repeat(Math.max(1, 12 - key.length))}${value}`)
        })
    }
    console.log()
}

/**
 * Generate a GUID for LayerZero messages
 */
export function generateGuid(
    nonce: string,
    srcEid: number,
    srcOappB32: string,
    dstEid: number,
    localOappB32: string
): string {
    // Validate inputs to prevent NaN values
    if (isNaN(srcEid) || srcEid < 0) {
        throw new Error(`Invalid srcEid: ${srcEid}. Must be a valid positive number.`)
    }
    if (isNaN(dstEid) || dstEid < 0) {
        throw new Error(`Invalid dstEid: ${dstEid}. Must be a valid positive number.`)
    }
    if (!nonce || nonce.trim() === '') {
        throw new Error(`Invalid nonce: ${nonce}. Must be a non-empty string.`)
    }

    return ethers.utils.keccak256(
        ethers.utils.solidityPack(
            ['uint64', 'uint32', 'bytes32', 'uint32', 'bytes32'],
            [nonce, srcEid, srcOappB32, dstEid, localOappB32]
        )
    )
}

/**
 * Checks the inbound nonces on the destination EndpointV2 for the channel (srcOFT -> dstOFT, srcEid).
 * Logs a warning if lazyInboundNonce !== inboundNonce + 1 which would cause InvalidNonce on manual execution.
 */
export async function noncePreflightCheck(
    dstHre: HardhatRuntimeEnvironment,
    srcOftAddress: string,
    dstOftAddress: string,
    srcEid: number
): Promise<void> {
    try {
        const signer = (await dstHre.ethers.getSigners())[0]
        const endpointDep = await dstHre.deployments.get('EndpointV2')
        const endpoint = new dstHre.ethers.Contract(endpointDep.address, endpointDep.abi, signer)

        const senderB32 = dstHre.ethers.utils.hexZeroPad(srcOftAddress, 32)

        const [lazyNonce, inboundNonce] = await Promise.all([
            endpoint.lazyInboundNonce(dstOftAddress, `${srcEid}`, senderB32),
            endpoint.inboundNonce(dstOftAddress, `${srcEid}`, senderB32),
        ])

        const nextNonceToExecute = inboundNonce.toNumber() + 1
        const nonceMismatch = lazyNonce.add(1).toString() !== nextNonceToExecute.toString()

        if (nonceMismatch) {
            DebugLogger.header('⚠️  SimpleWorkers Nonce Preflight: Mismatch')
            DebugLogger.keyValue('Expected next nonce', nextNonceToExecute)
            DebugLogger.keyValue('Lazy inbound nonce', lazyNonce.toString())
            DebugLogger.keyValue('Inbound nonce', inboundNonce.toString())
            throw new Error(
                'Nonce mismatch detected. Please execute commitAndExecute with the correct nonce or process pending messages first.'
            )
        }
    } catch (err) {
        DebugLogger.header('Failed preflight nonce check (SimpleWorkers)')
        DebugLogger.keyValue('Error', err instanceof Error ? err.message : String(err))
        throw err
    }
}

/**
 * Resolve and trigger SimpleWorkers processReceive flow on destination chain.
 */
export async function triggerProcessReceive(
    dstHre: HardhatRuntimeEnvironment,
    srcHre: HardhatRuntimeEnvironment,
    params: {
        srcEid: number
        dstEid: number
        to: string
        amount: string
        outboundNonce: string
        srcOftAddress: string
        dstOftAddress: string
        dstContractName?: string
        extraOptions?: string
    }
): Promise<void> {
    console.log('\n🧪 SimpleDVN Development Mode Enabled')
    console.log('⚠️  WARNING: This is for development/testing only. Do NOT use on mainnet.')

    const signer = (await dstHre.ethers.getSigners())[0]

    // Nonce preflight check before manual processing
    await noncePreflightCheck(dstHre, params.srcOftAddress, params.dstOftAddress, params.srcEid)

    // Get required contracts on destination chain
    const dvnDep = await dstHre.deployments.get('SimpleDVNMock')
    const dvnContract = new Contract(dvnDep.address, dvnDep.abi, signer)

    const dstOftContract = new Contract(
        params.dstOftAddress,
        await dstHre.artifacts.readArtifact('IOFT').then((a) => a.abi),
        signer
    )

    const simpleExecutorMockDep = await dstHre.deployments.get('SimpleExecutorMock')
    const simpleExecutorMock = new Contract(simpleExecutorMockDep.address, simpleExecutorMockDep.abi, signer)

    const receiveUln302Dep = await dstHre.deployments.get('ReceiveUln302')
    const receiveUln302Address = receiveUln302Dep.address

    const processArgs: SimpleDvnMockTaskArgs = {
        srcEid: params.srcEid,
        dstEid: params.dstEid,
        srcOapp: params.srcOftAddress,
        nonce: params.outboundNonce,
        toAddress: params.to,
        amount: params.amount,
        dstContractName: params.dstContractName,
        extraOptions: params.extraOptions,
    }

    const { processReceive } = await import('./processReceive')
    await processReceive(dvnContract, dstOftContract, simpleExecutorMock, receiveUln302Address, processArgs, dstHre)
}
