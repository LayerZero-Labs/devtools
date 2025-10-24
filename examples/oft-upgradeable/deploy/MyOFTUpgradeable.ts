import { DeployFunction } from 'hardhat-deploy/types'

import {
    deployImplementation,
    deployProxy,
    deployProxyAdmin,
    saveCombinedDeployment,
} from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId, endpointIdToNetwork } from '@layerzerolabs/lz-definitions'
import { getDeploymentAddressAndAbi } from '@layerzerolabs/lz-evm-sdk-v2'

/// @dev Replace MyOFTUpgradeable with the OFT you are deploying: i.e. MyOFTFeeUpgradeable, MyOFTUpgradeableMock
const contractName = 'MyOFTUpgradeable'

const deploy: DeployFunction = async (hre) => {
    const { getNamedAccounts } = hre
    const { deployer } = await getNamedAccounts()

    console.log(`Deploying ${contractName} on network: ${hre.network.name} with ${deployer}`)

    const eid = hre.network.config.eid as EndpointId
    const lzNetworkName = endpointIdToNetwork(eid)
    const { address: endpointAddress } = getDeploymentAddressAndAbi(lzNetworkName, 'EndpointV2')

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
        args: [endpointAddress],
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
