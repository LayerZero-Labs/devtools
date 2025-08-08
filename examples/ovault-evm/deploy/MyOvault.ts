import assert from 'assert'

import { type DeployFunction } from 'hardhat-deploy/types'

import { DEPLOYMENT_CONFIG, isHubChain, shouldDeployAsset, shouldDeployShare } from '../devtools'

const deploy: DeployFunction = async (hre) => {
    const { getNamedAccounts, deployments } = hre
    const { deployer } = await getNamedAccounts()
    const networkEid = hre.network.config?.eid

    assert(deployer, 'Missing named deployer account')
    assert(networkEid, `Network ${hre.network.name} is missing 'eid' in config`)

    console.log(`🚀 Deploying on ${hre.network.name} (EID: ${networkEid})`)
    console.log(`📍 Deployer: ${deployer}`)

    // 🛡️ Sanity check: Ensure Share OFT never deploys on hub
    if (isHubChain(networkEid) && shouldDeployShare(networkEid)) {
        throw new Error(
            `❌ CONFIGURATION ERROR: Share OFT should not deploy on hub chain (EID: ${networkEid}). ` +
                `Hub uses Share Adapter instead. Check your configuration.`
        )
    }

    const endpointV2 = await hre.deployments.get('EndpointV2')
    const deployedContracts: Record<string, string> = {}

    // 🎯 Deploy Asset OFT (on all configured chains)
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
        console.log(`✅ Asset OFT deployed: ${assetOFT.address}`)
    }

    // 🎯 Deploy Share OFT (only on spoke chains)
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
        console.log(`✅ Share OFT deployed: ${shareOFT.address}`)
    }

    // 🎯 Deploy Hub Chain Components (vault, adapter, composer)
    if (isHubChain(networkEid)) {
        // Get or deploy asset OFT address for vault
        const assetOFTAddress =
            deployedContracts.assetOFT || (await hre.deployments.get(DEPLOYMENT_CONFIG.asset.contract)).address

        // Deploy ERC4626 Vault
        const vault = await deployments.deploy(DEPLOYMENT_CONFIG.hub.contracts.vault, {
            from: deployer,
            args: [DEPLOYMENT_CONFIG.share.metadata.name, DEPLOYMENT_CONFIG.share.metadata.symbol, assetOFTAddress],
            log: true,
            skipIfAlreadyDeployed: true,
        })
        console.log(`✅ Vault deployed: ${vault.address}`)

        // Deploy Share Adapter
        const shareAdapter = await deployments.deploy(DEPLOYMENT_CONFIG.hub.contracts.shareAdapter, {
            from: deployer,
            args: [vault.address, endpointV2.address, deployer],
            log: true,
            skipIfAlreadyDeployed: true,
        })
        console.log(`✅ Share Adapter deployed: ${shareAdapter.address}`)

        // Deploy OVault Composer
        const composer = await deployments.deploy(DEPLOYMENT_CONFIG.hub.contracts.composer, {
            from: deployer,
            args: [vault.address, assetOFTAddress, shareAdapter.address],
            log: true,
            skipIfAlreadyDeployed: true,
        })
        console.log(`✅ OVault Composer deployed: ${composer.address}`)

        deployedContracts.vault = vault.address
        deployedContracts.shareAdapter = shareAdapter.address
        deployedContracts.composer = composer.address
    }

    console.log(`🎉 Deployment complete on ${hre.network.name}`)
    console.log('📋 Deployed contracts:', deployedContracts)
}

deploy.tags = ['ovault']
export default deploy
