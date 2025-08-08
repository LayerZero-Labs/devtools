import assert from 'assert'

import { ethers } from 'ethers'
import { type DeployFunction } from 'hardhat-deploy/types'

import {
    TokenMetadata,
    assetConfig,
    deployContract,
    getConfigType,
    oVaultConfig,
    shareConfig,
    shouldDeployOnNetwork,
} from '../devtools'

/// @dev It is possible to ONLY deploy the vault by setting the environment variable `ONLY_VAULT=1`
/// ex: // `ONLY_VAULT=1 npx hardhat deploy --tags ovault`
const deploy: DeployFunction = async (hre) => {
    const { getNamedAccounts, deployments } = hre

    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    assert(deployer, 'Missing named deployer account')

    console.log(`Network: ${hre.network.name}`)
    console.log(`Deployer: ${deployer}`)

    const networkEid = hre.network.config?.eid
    assert(networkEid, `Network ${hre.network.name} is missing 'eid' in config`)
    const endpointV2Deployment = await hre.deployments.get('EndpointV2')

    // Validate that vault contracts are deployed only on hub chain
    if (oVaultConfig.eid != hre.network.config.eid) {
        console.error(
            `Vault contracts can only be deployed on hub chain. Network '${hre.network.name}' is configured as spoke chain (isHubChain: false). Please deploy on a hub chain.`
        )
        return
    }

    let assetOFTAddress: string
    let vaultAddress: string

    if (getConfigType(assetConfig) === 'OFTAddress') {
        // The above asserts that assetConfig is a string
        assetOFTAddress = ethers.utils.getAddress(assetConfig.oft as string)
        console.log(`Using pre-deployed asset OFT at address: ${assetOFTAddress}`)
    } else if (shouldDeployOnNetwork(assetConfig, networkEid)) {
        const assetOFTMetadata = assetConfig.oft as TokenMetadata
        const deployment = await deployContract(hre, assetOFTMetadata.contractName, deployer, [
            assetOFTMetadata.tokenName,
            assetOFTMetadata.tokenSymbol,
            endpointV2Deployment.address,
            deployer,
        ])
        assetOFTAddress = deployment.address
    } else {
        throw new Error(`Skipping asset OFT deployment on network: ${hre.network.name}`)
    }

    if (ethers.utils.isAddress(oVaultConfig.vault)) {
        vaultAddress = oVaultConfig.vault
    } else {
        const deployment = await deployContract(hre, oVaultConfig.vault, deployer, [
            shareConfig.oft.tokenName,
            shareConfig.oft.tokenSymbol,
            assetOFTAddress,
        ])

        vaultAddress = deployment.address
    }

    const shareAdapterContractName = oVaultConfig.shareAdapterContractName

    const deployment = await deploy(shareAdapterContractName, {
        from: deployer,
        args: [vaultAddress, endpointV2Deployment.address, deployer],
        log: true,
        skipIfAlreadyDeployed: true,
    })

    const shareOFTAdapterAddress = deployment.address

    console.log(
        `Deployed contract: ${shareAdapterContractName}, network: ${hre.network.name}, address: ${shareOFTAdapterAddress}`
    )

    const { address: composerAddress } = await deploy(oVaultConfig.composer, {
        from: deployer,
        args: [vaultAddress, assetOFTAddress, shareOFTAdapterAddress],
        log: true,
        skipIfAlreadyDeployed: true,
    })

    console.log(
        `Deployed contract: ${oVaultConfig.composer}, network: ${hre.network.name}, address: ${composerAddress}`
    )
}

deploy.tags = ['ovault']

export default deploy
