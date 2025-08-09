import { Contract } from 'ethers'
import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { SetReceiveConfigArgs, setReceiveConfig } from './utils/setReceiveConfig'

// NOTE: This task is temporary and only needed while https://github.com/LayerZero-Labs/devtools/pull/1637 is being reviewed for merge.
// Once merged into the main devtools, this functionality will be integrated into the core tooling.
task(
    'lz:simple-workers:set-receive-config',
    'Set receive configuration for Simple Workers (SimpleDVNMock and SimpleExecutorMock)'
)
    .addParam('srcEid', 'Source chain EID', undefined, types.int)
    .addParam('contractName', 'Name of the contract in deployments', 'MyOFTMock', types.string)
    .addOptionalParam('dvn', 'DVN address (defaults to SimpleDVNMock)', undefined, types.string)
    .addOptionalParam('executorAddress', 'Executor address (defaults to SimpleExecutorMock)', undefined, types.string)
    .setAction(async (args: SetReceiveConfigArgs, hre: HardhatRuntimeEnvironment) => {
        const signer = (await hre.ethers.getSigners())[0]

        // Get contract deployment
        const contractDep = await hre.deployments.get(args.contractName)
        const contract = new Contract(contractDep.address, contractDep.abi, signer)

        // Get EndpointV2 contract
        const endpointDep = await hre.deployments.get('EndpointV2')
        const endpointContract = new Contract(endpointDep.address, endpointDep.abi, signer)

        // Get receive library (ReceiveUln302)
        const receiveLibDep = await hre.deployments.get('ReceiveUln302')
        const receiveLibrary = receiveLibDep.address

        // Get DVN address (default to SimpleDVNMock)
        let dvnAddress = args.dvn
        if (!dvnAddress) {
            const dvnDep = await hre.deployments.get('SimpleDVNMock')
            dvnAddress = dvnDep.address
        }

        // Get executor address (default to SimpleExecutorMock)
        let executorAddress = args.executorAddress
        if (!executorAddress) {
            const executorDep = await hre.deployments.get('SimpleExecutorMock')
            executorAddress = executorDep.address
        }

        await setReceiveConfig(
            endpointContract,
            {
                oappAddress: contract.address,
                receiveLibrary,
                dvnAddress,
                executorAddress,
                provider: hre.ethers.provider,
            },
            args
        )
    })
