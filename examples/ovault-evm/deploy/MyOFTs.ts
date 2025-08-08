import assert from 'assert'

import { type DeployFunction } from 'hardhat-deploy/types'

import {
    TokenMetadata,
    assetConfig,
    deployContract,
    oVaultConfig,
    shareConfig,
    shouldDeployOnNetwork,
} from '../devtools'

/// @dev This contact deploys the 2 meshes OFTs: asset and share.
/// The config file for them is in `devtools/deployConfig.ts`.
const deploy: DeployFunction = async (hre) => {
    const { getNamedAccounts } = hre

    const { deployer } = await getNamedAccounts()
    assert(deployer, 'Missing named deployer account')

    console.log(`Network: ${hre.network.name}`)
    console.log(`Deployer: ${deployer}`)

    const networkEid = hre.network.config?.eid
    assert(networkEid, `Network ${hre.network.name} is missing 'eid' in config`)

    const endpointV2Deployment = await hre.deployments.get('EndpointV2')

    if (shouldDeployOnNetwork(assetConfig, networkEid)) {
        const assetOFTMetadata = assetConfig.oft as TokenMetadata
        await deployContract(hre, assetOFTMetadata.contractName, deployer, [
            assetOFTMetadata.tokenName,
            assetOFTMetadata.tokenSymbol,
            endpointV2Deployment.address,
            deployer,
        ])
    }

    if (oVaultConfig.eid != hre.network.config.eid) {
        await deployContract(hre, shareConfig.oft.contractName, deployer, [
            shareConfig.oft.tokenName,
            shareConfig.oft.tokenSymbol,
            endpointV2Deployment.address,
            deployer,
        ])
    }
}

deploy.tags = ['not-vault-mesh']

export default deploy
