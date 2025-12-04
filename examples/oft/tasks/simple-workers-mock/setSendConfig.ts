import { Contract } from 'ethers'
import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { SetSendConfigArgs, setSendConfig } from './utils/setSendConfig'

// NOTE: This task is temporary and only needed while the https://github.com/LayerZero-Labs/devtools/pull/1637is being reviewed for merge.
// Once the PR is merged, executors can be specified in the LZ Config, just like DVN
task(
    'lz:simple-workers:set-send-config',
    'Set send configuration for Simple Workers (SimpleDVNMock and SimpleExecutorMock)'
)
    .addParam('dstEid', 'Destination chain EID', undefined, types.int)
    .addParam('contractName', 'Name of the contract in deployments', 'MyOFT', types.string)
    .addOptionalParam('executorAddress', 'Executor address (defaults to SimpleExecutorMock)', undefined, types.string)
    .setAction(async (args: SetSendConfigArgs, hre: HardhatRuntimeEnvironment) => {
        const signer = (await hre.ethers.getSigners())[0]

        // Get contract deployment
        const contractDep = await hre.deployments.get(args.contractName)
        const contract = new Contract(contractDep.address, contractDep.abi, signer)

        // Get EndpointV2 contract
        const endpointDep = await hre.deployments.get('EndpointV2')
        const endpointContract = new Contract(endpointDep.address, endpointDep.abi, signer)

        // Get send library (SendUln302)
        const sendLibDep = await hre.deployments.get('SendUln302')
        const sendLibrary = sendLibDep.address

        // Get DVN address (default to SimpleDVNMock)
        const dvnAddress = (await hre.deployments.get('SimpleDVNMock')).address

        // Get executor address (default to SimpleExecutorMock)
        const executorAddress = (await hre.deployments.get('SimpleExecutorMock')).address

        await setSendConfig(
            endpointContract,
            {
                oappAddress: contract.address,
                sendLibrary,
                dvnAddress,
                executorAddress,
                provider: hre.ethers.provider,
            },
            args
        )
    })
