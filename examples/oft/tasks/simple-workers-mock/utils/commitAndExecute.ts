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
    destinationExecutorMock: Contract,
    hre: HardhatRuntimeEnvironment
): Promise<void> {
    const { ethers } = hre
    const [signer] = await ethers.getSigners()

    console.log(`Calling commitAndExecute with signer: ${signer.address}`)
    console.log(`DestinationExecutorMock address: ${destinationExecutorMock.address}`)
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

    // Parse native drops from hex data
    let nativeDropParams: Array<{ _receiver: string; _amount: string }> = []

    if (params.nativeDrops && params.nativeDrops !== '0x' && params.nativeDrops.length > 2) {
        try {
            // Decode the hex-encoded native drop parameters
            const decodedParams = ethers.utils.defaultAbiCoder.decode(
                ['tuple(address _receiver, uint256 _amount)[]'],
                params.nativeDrops
            )
            nativeDropParams = decodedParams[0].map((param: any) => ({
                _receiver: param._receiver,
                _amount: param._amount.toString(),
            }))
            console.log(`📦 Parsed ${nativeDropParams.length} native drop(s) for execution`)
            nativeDropParams.forEach((param, index) => {
                console.log(`  Drop ${index + 1}: ${ethers.utils.formatEther(param._amount)} ETH to ${param._receiver}`)
            })
        } catch (error) {
            console.warn('⚠️  Failed to parse native drops from hex data:', error)
            console.warn('⚠️  Using empty native drops due to parsing error')
            nativeDropParams = []
        }
    }

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

    console.log('📦 Preparing commitAndExecute...')

    // Calculate total native drop amount
    const totalNativeDropAmount = nativeDropParams.reduce((sum, param) => {
        return sum.add(ethers.BigNumber.from(param._amount))
    }, ethers.BigNumber.from(0))

    console.log(`💰 Total native drop amount: ${ethers.utils.formatEther(totalNativeDropAmount)} ETH`)

    // Check signer balance
    const signerBalance = await signer.getBalance()
    if (signerBalance.lt(totalNativeDropAmount)) {
        throw new Error(
            `Insufficient balance. Signer has ${ethers.utils.formatEther(signerBalance)} ETH but needs ${ethers.utils.formatEther(totalNativeDropAmount)} ETH for native drops`
        )
    }

    try {
        // Estimate gas first
        const gasEstimate = await destinationExecutorMock.estimateGas.commitAndExecute(
            params.receiveLib,
            lzReceiveParam,
            nativeDropParams,
            { value: totalNativeDropAmount }
        )
        console.log(`Estimated gas: ${gasEstimate.toString()}`)

        // Call commitAndExecute
        const tx = await destinationExecutorMock.commitAndExecute(params.receiveLib, lzReceiveParam, nativeDropParams, {
            gasLimit: gasEstimate.mul(120).div(100), // Add 20% buffer
            value: totalNativeDropAmount,
        })

        console.log(`Transaction hash: ${tx.hash}`)

        // Wait for confirmation
        const receipt = await tx.wait()
        console.log(`Transaction confirmed in block: ${receipt.blockNumber}`)
        console.log(`Gas used: ${receipt.gasUsed.toString()}`)

        // Log events (simplified)
        if (receipt.events && receipt.events.length > 0) {
            console.log(`✅ ${receipt.events.length} events emitted`)
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
