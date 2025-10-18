import { DeployFunction } from 'hardhat-deploy/types'

import {
    deployImplementation,
    deployProxy,
    deployProxyAdmin,
    saveCombinedDeployment,
} from '@layerzerolabs/devtools-evm-hardhat'

const contractName = 'MyOFTAltUpgradeable'

const deploy: DeployFunction = async (hre) => {
    const signer = (await hre.ethers.getSigners())[0]
    console.log(`Deploying ${contractName} on network: ${hre.network.name} with ${signer.address}`)

    const endpointV2Deployment = await hre.deployments.get('EndpointV2')
    const endpointAddress = endpointV2Deployment.address

    const { address: proxyAdminAddress } = await deployProxyAdmin(hre, contractName, signer.address)

    const { address: implementationAddress } = await deployImplementation(hre, contractName, signer.address, [
        endpointAddress,
    ])

    const initializeInterface = new hre.ethers.utils.Interface([
        'function initialize(string memory name, string memory symbol, address delegate) public',
    ])
    const initializeData = initializeInterface.encodeFunctionData('initialize', ['MyOFT', 'MOFT', signer.address])

    await deployProxy(hre, contractName, signer.address, implementationAddress, proxyAdminAddress, initializeData)

    await saveCombinedDeployment(hre, contractName)
}

deploy.tags = [contractName]

export default deploy
