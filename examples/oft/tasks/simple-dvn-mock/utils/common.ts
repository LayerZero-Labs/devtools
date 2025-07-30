// tasks/simple-dvn-mock/utils/common.ts
import { Contract, ethers } from 'ethers'
import { parseUnits } from 'ethers/lib/utils'

import { addressToBytes32 } from '@layerzerolabs/lz-v2-utilities'

export interface SimpleDvnMockTaskArgs {
    srcEid: number
    srcOapp: string
    nonce: string
    toAddress: string
    amount: string
    dstEid: number
    dstContractName?: string
}

export interface ProcessedMessage {
    srcOAppB32: string
    toB32: string
    localOappB32: string
    message: string
    amountUnits: ethers.BigNumber
    sharedDecimals: number
    localOapp: string
}

/**
 * Process message parameters and build the message payload
 */
export async function processMessage(dstOftContract: Contract, args: SimpleDvnMockTaskArgs): Promise<ProcessedMessage> {
    const { srcOapp, toAddress, amount } = args

    const localOapp = dstOftContract.address

    // Get shared decimals from destination OFT contract
    const sharedDecimals: number = await dstOftContract.sharedDecimals()

    // Parse amount using shared decimals
    const amountUnits = parseUnits(amount, sharedDecimals)

    // Format addresses to bytes32
    const srcOAppB32 = addressToBytes32(srcOapp) as unknown as string
    const toB32 = addressToBytes32(toAddress) as unknown as string
    const localOappB32 = addressToBytes32(localOapp) as unknown as string

    // Build OFT message payload - only bytes32 (to) and uint64 (amount)
    const message = ethers.utils.solidityPack(['bytes32', 'uint64'], [toB32, amountUnits])

    return {
        srcOAppB32,
        toB32,
        localOappB32,
        message,
        amountUnits,
        sharedDecimals,
        localOapp,
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
    const { amountUnits, sharedDecimals, localOapp } = processed

    console.log(`\nCalling ${operation}:`)
    console.log(`  srcEid:       ${srcEid}`)
    console.log(`  srcOApp:      ${srcOapp}`)
    console.log(`  nonce:        ${nonce}`)
    console.log(`  toAddress:    ${toAddress}`)
    console.log(`  amount:       ${amount} (${amountUnits.toString()} units, ${sharedDecimals} decimals)`)
    console.log(`  dstEid:       ${dstEid}`)
    console.log(`  localOApp:    ${localOapp}`)

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
    return ethers.utils.keccak256(
        ethers.utils.solidityPack(
            ['uint64', 'uint32', 'bytes32', 'uint32', 'bytes32'],
            [nonce, srcEid, srcOappB32, dstEid, localOappB32]
        )
    )
}
