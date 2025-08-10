import { Contract } from 'ethers'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { generateGuid } from './common'

export interface CommitAndExecuteParams {
    receiveLib: string
    srcEid: string
    sender: string
    receiver: string
    nonce: string
    message: string
    dstEid: string
    guid?: string
    extraData?: string
    gas?: string
    value?: string
    nativeDrops?: string
}

export async function commitAndExecute(
    params: CommitAndExecuteParams,
    simpleExecutorMock: Contract,
    hre: HardhatRuntimeEnvironment
): Promise<void> {
    const { ethers } = hre
    const [signer] = await ethers.getSigners()

    console.log(`Calling commitAndExecute with signer: ${signer.address}`)
    console.log(`SimpleExecutorMock address: ${simpleExecutorMock.address}`)
    console.log(`Nonce: ${params.nonce}`)

    // Get endpoint contract to check nonces
    const endpointDeployment = await hre.deployments.get('EndpointV2')
    const endpoint = new Contract(endpointDeployment.address, endpointDeployment.abi, signer)

    // Generate GUID
    const senderB32 = ethers.utils.hexZeroPad(params.sender, 32)
    const receiverB32 = ethers.utils.hexZeroPad(params.receiver, 32)

    // Parse and validate EIDs
    const srcEidNum = parseInt(params.srcEid)
    const dstEidNum = parseInt(params.dstEid)

    if (isNaN(srcEidNum)) {
        throw new Error(`Invalid srcEid: "${params.srcEid}". Must be a valid number.`)
    }
    if (isNaN(dstEidNum)) {
        throw new Error(`Invalid dstEid: "${params.dstEid}". Must be a valid number.`)
    }

    const guid = generateGuid(params.nonce, srcEidNum, senderB32, dstEidNum, receiverB32)
    console.log(`Generated GUID: ${guid}`)

    // Check inbound nonces
    try {
        const lazyNonce = await endpoint.lazyInboundNonce(params.receiver, params.srcEid, senderB32)
        const inboundNonce = await endpoint.inboundNonce(params.receiver, params.srcEid, senderB32)
        console.log(`Lazy inbound nonce: ${lazyNonce.toString()}`)
        console.log(`Inbound nonce: ${inboundNonce.toString()}`)
        console.log(`Message nonce: ${params.nonce}`)
    } catch (error) {
        console.warn('Failed to fetch nonce information:', error instanceof Error ? error.message : String(error))
    }

    // Parse native drops from hex data (using empty array for simplified version)
    const nativeDropParams: Array<{ _receiver: string; _amount: string }> = []

    // Construct the LzReceiveParam struct
    const lzReceiveParam = {
        origin: {
            srcEid: params.srcEid,
            sender: senderB32,
            nonce: params.nonce,
        },
        receiver: params.receiver,
        guid: guid,
        message: params.message,
        extraData: '0x',
        gas: '200000',
        value: '0',
    }

    console.log('LzReceiveParam:', JSON.stringify(lzReceiveParam, null, 2))
    console.log('NativeDropParams:', JSON.stringify(nativeDropParams, null, 2))

    try {
        // Estimate gas first
        const gasEstimate = await simpleExecutorMock.estimateGas.commitAndExecute(
            params.receiveLib,
            lzReceiveParam,
            nativeDropParams,
            { value: '0' }
        )
        console.log(`Estimated gas: ${gasEstimate.toString()}`)

        // Call commitAndExecute
        const tx = await simpleExecutorMock.commitAndExecute(params.receiveLib, lzReceiveParam, nativeDropParams, {
            gasLimit: gasEstimate.mul(120).div(100), // Add 20% buffer
            value: '0',
        })

        console.log(`Transaction hash: ${tx.hash}`)

        // Wait for confirmation
        const receipt = await tx.wait()
        console.log(`Transaction confirmed in block: ${receipt.blockNumber}`)
        console.log(`Gas used: ${receipt.gasUsed.toString()}`)

        // Log events
        if (receipt.events && receipt.events.length > 0) {
            console.log('Events emitted:')
            receipt.events.forEach((event: unknown, index: number) => {
                console.log(`  Event ${index}:`, event)
            })
        }

        console.log('✅ commitAndExecute completed successfully!')
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        console.error('❌ Transaction failed:', errorMessage)

        if (error && typeof error === 'object' && 'reason' in error) {
            console.error('Revert reason:', (error as { reason: string }).reason)
        }
        if (error && typeof error === 'object' && 'data' in error) {
            console.error('Error data:', (error as { data: unknown }).data)
        }

        // Re-throw the error so the calling function knows it failed
        throw error
    }
}
