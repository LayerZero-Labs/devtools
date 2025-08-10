import { Contract } from 'ethers'
import { task } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { CommitAndExecuteParams, commitAndExecute } from './utils/commitAndExecute'

task('commitAndExecute', 'Call commitAndExecute on SimpleExecutorMock')
    .addParam('srcEid', 'Source endpoint ID')
    .addParam('sender', 'Sender address (EVM address)')
    .addParam('receiver', 'Receiver address')
    .addParam('nonce', 'Message nonce')
    .addParam('message', 'Message payload (hex string)')
    .addParam('dstEid', 'Destination endpoint ID')
    .setAction(async (taskArgs: CommitAndExecuteParams, hre: HardhatRuntimeEnvironment) => {
        const { ethers, deployments } = hre
        const [signer] = await ethers.getSigners()

        // Get the deployed contracts
        const simpleExecutorMockDeployment = await deployments.get('SimpleExecutorMock')
        const simpleExecutorMock = new Contract(
            simpleExecutorMockDeployment.address,
            simpleExecutorMockDeployment.abi,
            signer
        )

        const receiveUln302Deployment = await deployments.get('ReceiveUln302')
        const receiveUln302Address = receiveUln302Deployment.address

        // Add receiveLib to taskArgs
        const paramsWithReceiveLib = {
            ...taskArgs,
            receiveLib: receiveUln302Address,
        }

        await commitAndExecute(paramsWithReceiveLib, simpleExecutorMock, hre)
    })
