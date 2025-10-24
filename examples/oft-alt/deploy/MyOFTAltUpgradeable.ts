import { DeployFunction } from 'hardhat-deploy/types'

import {
    deployImplementation,
    deployProxy,
    deployProxyAdmin,
    saveCombinedDeployment,
} from '@layerzerolabs/devtools-evm-hardhat'

const contractName = 'MyOFTAltUpgradeable'

const deploy: DeployFunction = async (hre) => {
    const { getNamedAccounts } = hre
    const { deployer } = await getNamedAccounts()

    console.log(`Deploying ${contractName} on network: ${hre.network.name} with ${deployer}`)

    /// EndpointV2Alt deployments are also saved under the filename: EndpointV2
    const endpointV2AltDeployment = await hre.deployments.get('EndpointV2')

    const { address: proxyAdminAddress } = await deployProxyAdmin({
        hre,
        contractName,
        deployer,
        owner: deployer,
        skipIfAlreadyDeployed: true,
    })

    const { address: implementationAddress } = await deployImplementation({
        hre,
        contractName,
        deployer,
        args: [endpointV2AltDeployment.address],
        skipIfAlreadyDeployed: true,
    })

    const initializeInterface = new hre.ethers.utils.Interface([
        'function initialize(string memory name, string memory symbol, address delegate)',
    ])
    const initializeData = initializeInterface.encodeFunctionData('initialize', ['MyOFT', 'MOFT', deployer])

    await deployProxy({
        hre,
        contractName,
        deployer,
        implementationAddress,
        proxyAdminAddress,
        initializeData,
        skipIfAlreadyDeployed: true,
    })

    await saveCombinedDeployment({ hre, contractName })
}

deploy.tags = [contractName]

export default deploy
