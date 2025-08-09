import assert from 'assert'

import { type DeployFunction } from 'hardhat-deploy/types'

import { DEPLOYMENT_CONFIG, isVaultChain, shouldDeployAsset, shouldDeployShare } from '../devtools'

const deploy: DeployFunction = async (hre) => {
    const { getNamedAccounts, deployments } = hre
    const { deployer } = await getNamedAccounts()
    const networkEid = hre.network.config?.eid

    assert(deployer, 'Missing named deployer account')
    assert(networkEid, `Network ${hre.network.name} is missing 'eid' in config`)

    console.log(`Network: ${hre.network.name}`)
    console.log(`Deployer: ${deployer}`)

    // Sanity check: Ensure Share OFT never deploys on vault chain
    if (isVaultChain(networkEid) && shouldDeployShare(networkEid)) {
        throw new Error(
            `Configuration error: Share OFT should not deploy on vault chain (EID: ${networkEid}). ` +
                `Vault chain uses Share Adapter instead. Check your configuration.`
        )
    }

    const endpointV2 = await hre.deployments.get('EndpointV2')
    const deployedContracts: Record<string, string> = {}

    // Deploy Asset OFT (on all configured chains)
    if (shouldDeployAsset(networkEid)) {
        const assetOFT = await deployments.deploy(DEPLOYMENT_CONFIG.asset.contract, {
            from: deployer,
            args: [
                DEPLOYMENT_CONFIG.asset.metadata.name,
                DEPLOYMENT_CONFIG.asset.metadata.symbol,
                endpointV2.address,
                deployer,
            ],
            log: true,
            skipIfAlreadyDeployed: true,
        })
        deployedContracts.assetOFT = assetOFT.address
        console.log(
            `Deployed contract: ${DEPLOYMENT_CONFIG.asset.contract}, network: ${hre.network.name}, address: ${assetOFT.address}`
        )
    }

    // Deploy Share OFT (only on spoke chains)
    if (shouldDeployShare(networkEid)) {
        const shareOFT = await deployments.deploy(DEPLOYMENT_CONFIG.share.contract, {
            from: deployer,
            args: [
                DEPLOYMENT_CONFIG.share.metadata.name,
                DEPLOYMENT_CONFIG.share.metadata.symbol,
                endpointV2.address,
                deployer,
            ],
            log: true,
            skipIfAlreadyDeployed: true,
        })
        deployedContracts.shareOFT = shareOFT.address
        console.log(
            `Deployed contract: ${DEPLOYMENT_CONFIG.share.contract}, network: ${hre.network.name}, address: ${shareOFT.address}`
        )
    }

    // Deploy Vault Chain Components (vault, adapter, composer)
    if (isVaultChain(networkEid)) {
        // 🎯 Get asset address (existing or deployed)
        let assetOFTAddress: string

        if (DEPLOYMENT_CONFIG.vault.assetAddress) {
            assetOFTAddress = DEPLOYMENT_CONFIG.vault.assetAddress
            console.log(`Using existing asset address: ${assetOFTAddress}`)
        } else {
            // Use deployed address or get from deployments
            assetOFTAddress =
                deployedContracts.assetOFT || (await hre.deployments.get(DEPLOYMENT_CONFIG.asset.contract)).address
            console.log(`Using deployed asset address: ${assetOFTAddress}`)
        }

        // Deploy ERC4626 Vault
        const vault = await deployments.deploy(DEPLOYMENT_CONFIG.vault.contracts.vault, {
            from: deployer,
            args: [DEPLOYMENT_CONFIG.share.metadata.name, DEPLOYMENT_CONFIG.share.metadata.symbol, assetOFTAddress],
            log: true,
            skipIfAlreadyDeployed: true,
        })
        console.log(
            `Deployed contract: ${DEPLOYMENT_CONFIG.vault.contracts.vault}, network: ${hre.network.name}, address: ${vault.address}`
        )

        // Deploy Share Adapter
        const shareAdapter = await deployments.deploy(DEPLOYMENT_CONFIG.vault.contracts.shareAdapter, {
            from: deployer,
            args: [vault.address, endpointV2.address, deployer],
            log: true,
            skipIfAlreadyDeployed: true,
        })
        console.log(
            `Deployed contract: ${DEPLOYMENT_CONFIG.vault.contracts.shareAdapter}, network: ${hre.network.name}, address: ${shareAdapter.address}`
        )

        // Deploy OVault Composer
        const composer = await deployments.deploy(DEPLOYMENT_CONFIG.vault.contracts.composer, {
            from: deployer,
            args: [vault.address, assetOFTAddress, shareAdapter.address],
            log: true,
            skipIfAlreadyDeployed: true,
        })
        console.log(
            `Deployed contract: ${DEPLOYMENT_CONFIG.vault.contracts.composer}, network: ${hre.network.name}, address: ${composer.address}`
        )

        deployedContracts.vault = vault.address
        deployedContracts.shareAdapter = shareAdapter.address
        deployedContracts.composer = composer.address
    }

    console.log(`Deployment complete on ${hre.network.name}`)
}

deploy.tags = ['ovault']

export default deploy
