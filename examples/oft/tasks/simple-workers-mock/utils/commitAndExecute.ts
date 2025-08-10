import { Contract } from 'ethers'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

export interface CommitAndExecuteParams {
    srcEid: string
    sender: string
    receiver: string
    nonce: string
    guid: string
    message: string
    extraData?: string
    gas?: string
    value?: string
    nativeDrops?: string
}

export async function commitAndExecute(
    params: CommitAndExecuteParams,
    simpleExecutorMock: Contract,
    receiveUln302Address: string,
    hre: HardhatRuntimeEnvironment
): Promise<void> {
    const { ethers } = hre
    const [signer] = await ethers.getSigners()

    console.log(`Calling commitAndExecute with signer: ${signer.address}`)
    console.log(`SimpleExecutorMock address: ${simpleExecutorMock.address}`)

    // Parse native drops if provided
    let nativeDropParams: Array<{ _receiver: string; _amount: string }> = []
    if (params.nativeDrops && params.nativeDrops !== '[]') {
        try {
            nativeDropParams = JSON.parse(params.nativeDrops)
        } catch (error) {
            console.error('Failed to parse nativeDrops JSON:', error)
            return
        }
    }

    // Construct the LzReceiveParam struct
    const lzReceiveParam = {
        origin: {
            srcEid: params.srcEid,
            sender: params.sender,
            nonce: params.nonce,
        },
        receiver: params.receiver,
        guid: params.guid,
        message: params.message,
        extraData: params.extraData || '0x',
        gas: params.gas || '200000',
        value: params.value || '0',
    }

    console.log('LzReceiveParam:', JSON.stringify(lzReceiveParam, null, 2))
    console.log('NativeDropParams:', JSON.stringify(nativeDropParams, null, 2))

    try {
        // Estimate gas first
        const gasEstimate = await simpleExecutorMock.estimateGas.commitAndExecute(
            receiveUln302Address,
            lzReceiveParam,
            nativeDropParams,
            { value: params.value || '0' }
        )
        console.log(`Estimated gas: ${gasEstimate.toString()}`)

        // Call commitAndExecute
        const tx = await simpleExecutorMock.commitAndExecute(receiveUln302Address, lzReceiveParam, nativeDropParams, {
            value: params.value || '0',
            gasLimit: gasEstimate.mul(120).div(100), // Add 20% buffer
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
    }
}
