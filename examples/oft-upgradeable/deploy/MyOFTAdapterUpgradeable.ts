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
    const signer = (await hre.ethers.getSigners())[0]
    console.log(`Deploying ${contractName} on network: ${hre.network.name} with ${signer.address}`)

    const eid = hre.network.config.eid as EndpointId
    const lzNetworkName = endpointIdToNetwork(eid)
    const { address: endpointAddress } = getDeploymentAddressAndAbi(lzNetworkName, 'EndpointV2')

    const { address: proxyAdminAddress } = await deployProxyAdmin(hre, contractName, signer.address)

    const { address: implementationAddress } = await deployImplementation(hre, contractName, signer.address, [
        '0x', // replace '0x' with the address of the ERC-20 token
        endpointAddress,
    ])

    const initializeInterface = new hre.ethers.utils.Interface(['function initialize(address delegate) public'])
    const initializeData = initializeInterface.encodeFunctionData('initialize', [signer.address])

    await deployProxy(hre, contractName, signer.address, implementationAddress, proxyAdminAddress, initializeData)

    await saveCombinedDeployment(hre, contractName)
}

deploy.tags = [contractName]

export default deploy
