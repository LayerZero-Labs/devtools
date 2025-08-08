import assert from 'assert'

import { type DeployFunction } from 'hardhat-deploy/types'

import { assetToken, oVault, shareToken } from './tokenConfig'
import {
    TokenDeployConfig,
    checkAddressOrGetDeployment,
    isContractAddress,
    isVaultChain,
    onlyDeployVault,
} from './types'

/// @dev It is possible to ONLY deploy the vault by setting the environment variable `ONLY_VAULT=1`
/// ex: // `ONLY_VAULT=1 npx hardhat deploy --tags ovault`
const deploy: DeployFunction = async (hre) => {
    const { getNamedAccounts, deployments } = hre

    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    assert(deployer, 'Missing named deployer account')

    console.log(`Network: ${hre.network.name}`)
    console.log(`Deployer: ${deployer}`)

    // Validate that vault contracts are deployed only on hub chain
    if (!isVaultChain(hre.network.config)) {
        console.error(
            `Vault contracts can only be deployed on hub chain. Network '${hre.network.name}' is configured as spoke chain (isHubChain: false). Please deploy on a hub chain.`
        )
        return
    }

    const assetTokenAddress = await checkAddressOrGetDeployment(hre, assetToken)

    const shareTokenConfig = shareToken as TokenDeployConfig
    const { address: ovaultAddress } = await deploy(oVault.vault, {
        from: deployer,
        args: [shareTokenConfig.tokenName, shareTokenConfig.tokenSymbol, assetTokenAddress],
        log: true,
        skipIfAlreadyDeployed: true,
    })

    console.log(`Deployed contract: ${oVault.vault}, network: ${hre.network.name}, address: ${ovaultAddress}`)

    // Early exit if we only want to deploy the vault
    // Executing the same without 'ONLY_VAULT=1' will resume the share OFT adapter deployment.
    if (onlyDeployVault()) return

    const shareAdapterContractName = oVault.shareAdapterContractName
    if (isContractAddress(shareAdapterContractName)) {
        throw new Error(`Should be a contract name. Found: ${shareAdapterContractName}`)
    }

    const endpointV2Deployment = await hre.deployments.get('EndpointV2')
    const { address: shareOFTAdapterAddress } = await deploy(shareAdapterContractName, {
        from: deployer,
        args: [ovaultAddress, endpointV2Deployment.address, deployer],
        log: true,
        skipIfAlreadyDeployed: true,
    })

    console.log(
        `Deployed contract: ${shareAdapterContractName}, network: ${hre.network.name}, address: ${shareOFTAdapterAddress}`
    )
}

deploy.tags = ['ovault']

export default deploy
