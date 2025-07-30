// tasks/simple-dvn-mock/setReceiveConfig.ts
import { Contract } from 'ethers'
import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { SetReceiveConfigArgs, SetReceiveConfigParams, setReceiveConfig } from './utils/setReceiveConfig'

task('lz:simple-dvn:set-receive-config', 'Configure ULN receive side to use your SimpleDVN for both ULN and Executor')
    .addParam('srcEid', 'Peer/source EID', undefined, types.int)
    .addParam('contractName', 'Name of the destination chain OFT in deployments', 'MyOFTMock', types.string)
    .addOptionalParam('executorAddress', 'Executor address', undefined, types.string) // default value obtained from Executor deployment
    .addOptionalParam('dvn', 'SimpleDVN address', undefined, types.string) // default value obtained from SimpleDVN deployment
    .setAction(async (args: SetReceiveConfigArgs, hre: HardhatRuntimeEnvironment) => {
        const signer = (await hre.ethers.getSigners())[0]

        // Get the OApp contract deployment
        const oappDep = await hre.deployments.get(args.contractName)
        const oappAddress = oappDep.address

        // Get the Endpoint contract
        const endpointDep = await hre.deployments.get('EndpointV2')
        const endpointContract = new Contract(endpointDep.address, endpointDep.abi, signer)

        // Get ReceiveUln302 address
        const recvUlnDep = await hre.deployments.get('ReceiveUln302')
        const receiveLibrary = recvUlnDep.address

        // Resolve executor address
        let appliedExecutorAddress = args.executorAddress
        if (!args.executorAddress) {
            appliedExecutorAddress = (await hre.deployments.get('Executor')).address
        }

        // Get SimpleDVN address
        const dvnDep = await hre.deployments.get('SimpleDVN')
        const dvnAddress = args.dvn || dvnDep.address

        const params: SetReceiveConfigParams = {
            oappAddress,
            receiveLibrary,
            dvnAddress,
            executorAddress: appliedExecutorAddress!,
            provider: hre.ethers.provider,
        }

        await setReceiveConfig(endpointContract, params, args)
    })
