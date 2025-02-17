import { Contract } from 'ethers'
import { type DeployFunction } from 'hardhat-deploy/types'

import { getDeploymentAddressAndAbi } from '@layerzerolabs/lz-evm-sdk-v2'

const contractName = 'MyOFTAdapterUpgradeable'

const deploy: DeployFunction = async (hre) => {
    const { deploy } = hre.deployments
    const signer = (await hre.ethers.getSigners())[0]
    console.log(`deploying ${contractName} on network: ${hre.network.name} with ${signer.address}`)

    const { address, abi } = getDeploymentAddressAndAbi(hre.network.name, 'EndpointV2')
    const endpointV2Deployment = new Contract(address, abi, signer)

    await deploy(contractName, {
        from: signer.address,
        args: ['0x', endpointV2Deployment.address], // replace '0x' with the address of the ERC-20 token
        log: true,
        waitConfirmations: 1,
        skipIfAlreadyDeployed: false,
        proxy: {
            proxyContract: 'OpenZeppelinTransparentProxy',
            owner: signer.address,
            execute: {
                init: {
                    methodName: 'initialize',
                    args: [signer.address],
                },
            },
        },
    })
}

deploy.tags = [contractName]

export default deploy
