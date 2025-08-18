import { Contract } from 'ethers'
import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

interface CommitAndExecuteTaskArgs {
    receiveLib: string
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

task('commitAndExecute', 'Call commitAndExecute on SimpleExecutorMock')
    .addParam('receiveLib', 'The receive library address')
    .addParam('srcEid', 'Source endpoint ID')
    .addParam('sender', 'Sender address (bytes32)')
    .addParam('receiver', 'Receiver address')
    .addParam('nonce', 'Message nonce')
    .addParam('guid', 'Message GUID (bytes32)')
    .addParam('message', 'Message payload (hex string)')
    .addOptionalParam('extraData', 'Extra data (hex string)', '0x')
    .addOptionalParam('gas', 'Gas limit for lzReceive', '200000')
    .addOptionalParam('value', 'Value to send with lzReceive', '0')
    .addOptionalParam('nativeDrops', 'Native drop parameters as JSON string', '[]')
    .setAction(async (taskArgs: CommitAndExecuteTaskArgs, hre: HardhatRuntimeEnvironment) => {
        const { ethers, deployments } = hre
        const [signer] = await ethers.getSigners()

        console.log(`Calling commitAndExecute with signer: ${signer.address}`)

        // Get the deployed SimpleExecutorMock contract
        const simpleExecutorMockDeployment = await deployments.get('SimpleExecutorMock')
        const simpleExecutorMock = new Contract(
            simpleExecutorMockDeployment.address,
            simpleExecutorMockDeployment.abi,
            signer
        )

        console.log(`SimpleExecutorMock address: ${simpleExecutorMock.address}`)

        // Parse native drops if provided
        let nativeDropParams: Array<{ _receiver: string; _amount: string }> = []
        if (taskArgs.nativeDrops && taskArgs.nativeDrops !== '[]') {
            try {
                nativeDropParams = JSON.parse(taskArgs.nativeDrops)
            } catch (error) {
                console.error('Failed to parse nativeDrops JSON:', error)
                return
            }
        }

        // Construct the LzReceiveParam struct
        const lzReceiveParam = {
            origin: {
                srcEid: taskArgs.srcEid,
                sender: taskArgs.sender,
                nonce: taskArgs.nonce,
            },
            receiver: taskArgs.receiver,
            guid: taskArgs.guid,
            message: taskArgs.message,
            extraData: taskArgs.extraData || '0x',
            gas: taskArgs.gas || '200000',
            value: taskArgs.value || '0',
        }

        console.log('LzReceiveParam:', JSON.stringify(lzReceiveParam, null, 2))
        console.log('NativeDropParams:', JSON.stringify(nativeDropParams, null, 2))

        try {
            // Estimate gas first
            const gasEstimate = await simpleExecutorMock.estimateGas.commitAndExecute(
                taskArgs.receiveLib,
                lzReceiveParam,
                nativeDropParams,
                { value: taskArgs.value || '0' }
            )
            console.log(`Estimated gas: ${gasEstimate.toString()}`)

            // Call commitAndExecute
            const tx = await simpleExecutorMock.commitAndExecute(
                taskArgs.receiveLib,
                lzReceiveParam,
                nativeDropParams,
                {
                    value: taskArgs.value || '0',
                    gasLimit: gasEstimate.mul(120).div(100), // Add 20% buffer
                }
            )

            console.log(`Transaction hash: ${tx.hash}`)

            // Wait for confirmation
            const receipt = await tx.wait()
            console.log(`Transaction confirmed in block: ${receipt.blockNumber}`)
            console.log(`Gas used: ${receipt.gasUsed.toString()}`)

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
    })
