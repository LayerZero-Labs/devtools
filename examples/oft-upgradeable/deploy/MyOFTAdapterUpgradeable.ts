import { DeployFunction } from 'hardhat-deploy/types'

import {
    deployImplementation,
    deployProxy,
    deployProxyAdmin,
    saveCombinedDeployment,
} from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId, endpointIdToNetwork } from '@layerzerolabs/lz-definitions'
import { getDeploymentAddressAndAbi } from '@layerzerolabs/lz-evm-sdk-v2'

/// @dev Replace MyOFTAdapterUpgradeable with the OFT adapter you are deploying: i.e. MyOFTAdapterFeeUpgradeable
const contractName = 'MyOFTAdapterUpgradeable'

const deploy: DeployFunction = async (hre) => {
    const { getNamedAccounts } = hre
    const { deployer } = await getNamedAccounts()

    console.log(`Deploying ${contractName} on network: ${hre.network.name} with ${deployer}`)

    const eid = hre.network.config.eid as EndpointId
    const lzNetworkName = endpointIdToNetwork(eid)
    const { address: endpointAddress } = getDeploymentAddressAndAbi(lzNetworkName, 'EndpointV2')

    const tokenAddress = hre.network.config.oftAdapter?.tokenAddress
    if (tokenAddress == null) {
        console.warn(`oftAdapter not configured on network config, skipping OFTAdapterUpgradeable deployment`)
        return
    }

    const { address: proxyAdminAddress } = await deployProxyAdmin({
        hre,
        contractName,
        deployer,
        owner: deployer,
    })

    const { address: implementationAddress } = await deployImplementation({
        hre,
        contractName,
        deployer,
        args: [tokenAddress, endpointAddress],
    })

    const initializeInterface = new hre.ethers.utils.Interface(['function initialize(address delegate)'])
    const initializeData = initializeInterface.encodeFunctionData('initialize', [deployer])

    await deployProxy({
        hre,
        contractName,
        deployer,
        implementationAddress,
        proxyAdminAddress,
        initializeData,
    })

    await saveCombinedDeployment({ hre, contractName })
}

deploy.tags = [contractName]

export default deploy
