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
        const assetOFT = await deployments.deploy(DEPLOYMENT_CONFIG.assetOFT.contract, {
            from: deployer,
            args: [
                DEPLOYMENT_CONFIG.assetOFT.metadata.name,
                DEPLOYMENT_CONFIG.assetOFT.metadata.symbol,
                endpointV2.address,
                deployer,
            ],
            log: true,
            skipIfAlreadyDeployed: true,
        })
        deployedContracts.assetOFT = assetOFT.address
        console.log(
            `Deployed contract: ${DEPLOYMENT_CONFIG.assetOFT.contract}, network: ${hre.network.name}, address: ${assetOFT.address}`
        )
    } else if (DEPLOYMENT_CONFIG.vault.assetOFTAddress) {
        console.log(
            'Skipping asset deployment since Asset OFT mesh already exists. Existing meshes need to be managed outside of this repo; this script only handles new mesh deployments.'
        )
    }

    // Deploy Share OFT (only on spoke chains)
    if (shouldDeployShare(networkEid)) {
        const shareOFT = await deployments.deploy(DEPLOYMENT_CONFIG.shareOFT.contract, {
            from: deployer,
            args: [
                DEPLOYMENT_CONFIG.shareOFT.metadata.name,
                DEPLOYMENT_CONFIG.shareOFT.metadata.symbol,
                endpointV2.address,
                deployer,
            ],
            log: true,
            skipIfAlreadyDeployed: true,
        })
        deployedContracts.shareOFT = shareOFT.address
        console.log(
            `Deployed contract: ${DEPLOYMENT_CONFIG.shareOFT.contract}, network: ${hre.network.name}, address: ${shareOFT.address}`
        )
    } else if (DEPLOYMENT_CONFIG.vault.shareOFTAdapterAddress && !isVaultChain(networkEid)) {
        // Use existing ShareOFTAdapter on this spoke chain
        deployedContracts.shareOFT = DEPLOYMENT_CONFIG.vault.shareOFTAdapterAddress
        console.log(
            'Skipping share deployment since Share OFT mesh already exists. Existing meshes need to be managed outside of this repo; this script only handles new mesh deployments.'
        )
    }

    // Deploy Vault Chain Components (vault, adapter, composer)
    if (isVaultChain(networkEid)) {
        // Get asset address (existing or deployed)
        let assetOFTAddress: string

        if (DEPLOYMENT_CONFIG.vault.assetOFTAddress) {
            assetOFTAddress = DEPLOYMENT_CONFIG.vault.assetOFTAddress
            console.log(`Using existing asset address: ${assetOFTAddress}`)
        } else {
            // Use deployed address or get from deployments
            assetOFTAddress =
                deployedContracts.assetOFT || (await hre.deployments.get(DEPLOYMENT_CONFIG.assetOFT.contract)).address
            console.log(`Using deployed asset address: ${assetOFTAddress}`)
            // Fetch underlying ERC20 token address from the OFT using the IOFT artifact
            const IOFTArtifact = await hre.artifacts.readArtifact('IOFT')
            const oftContract = await hre.ethers.getContractAt(IOFTArtifact.abi, assetOFTAddress)
            const assetTokenAddress = await oftContract.token()
            console.log(`Underlying ERC20 token address found from OFT deployment: ${assetTokenAddress}`)
        }

        // Get vault address (existing or deploy new)
        let vaultAddress: string

        if (DEPLOYMENT_CONFIG.vault.vaultAddress) {
            vaultAddress = DEPLOYMENT_CONFIG.vault.vaultAddress
            console.log(`Using existing vault address: ${vaultAddress}`)
        } else {
            // Deploy ERC4626 Vault
            const vault = await deployments.deploy(DEPLOYMENT_CONFIG.vault.contracts.vault, {
                from: deployer,
                args: [
                    DEPLOYMENT_CONFIG.shareOFT.metadata.name,
                    DEPLOYMENT_CONFIG.shareOFT.metadata.symbol,
                    assetOFTAddress,
                ],
                log: true,
                skipIfAlreadyDeployed: true,
            })
            vaultAddress = vault.address
            console.log(
                `Deployed contract: ${DEPLOYMENT_CONFIG.vault.contracts.vault}, network: ${hre.network.name}, address: ${vaultAddress}`
            )
        }

        // Deploy or use existing Share Adapter
        let shareAdapterAddress: string
        if (!DEPLOYMENT_CONFIG.vault.shareOFTAdapterAddress) {
            const shareAdapter = await deployments.deploy(DEPLOYMENT_CONFIG.vault.contracts.shareAdapter, {
                from: deployer,
                args: [vaultAddress, endpointV2.address, deployer],
                log: true,
                skipIfAlreadyDeployed: true,
            })
            shareAdapterAddress = shareAdapter.address
            console.log(
                `Deployed contract: ${DEPLOYMENT_CONFIG.vault.contracts.shareAdapter}, network: ${hre.network.name}, address: ${shareAdapterAddress}`
            )
        } else {
            // Skip ShareOFTAdapter deployment when pre-deployed
            const existingAdapter = await hre.deployments.get(DEPLOYMENT_CONFIG.vault.contracts.shareAdapter)
            shareAdapterAddress = existingAdapter.address
            console.log(
                'Skipping Share Adapter deployment since Share OFT mesh already exists. Existing meshes need to be managed outside of this repo; this script only handles new mesh deployments.'
            )
        }

        // Deploy OVault Composer
        const composer = await deployments.deploy(DEPLOYMENT_CONFIG.vault.contracts.composer, {
            from: deployer,
            args: [vaultAddress, assetOFTAddress, shareAdapterAddress],
            log: true,
            skipIfAlreadyDeployed: true,
        })
        console.log(
            `Deployed contract: ${DEPLOYMENT_CONFIG.vault.contracts.composer}, network: ${hre.network.name}, address: ${composer.address}`
        )

        deployedContracts.vault = vaultAddress
        deployedContracts.shareAdapter = shareAdapterAddress
        deployedContracts.composer = composer.address
    }

    console.log(`Deployment complete on ${hre.network.name}`)
}

deploy.tags = ['ovault']

export default deploy
