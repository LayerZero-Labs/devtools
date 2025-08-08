import assert from 'assert'

import { type DeployFunction } from 'hardhat-deploy/types'

import { assetToken, oVault } from './tokenConfig'
import { checkAddressOrGetDeployment, isVaultChain, onlyDeployVault } from './types'

/// @dev Since this script has `runAtTheEnd = true` it will run after the MyERC4626 script
const deploy: DeployFunction = async (hre) => {
    const { getNamedAccounts, deployments } = hre

    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    assert(deployer, 'Missing named deployer account')

    console.log(`Network: ${hre.network.name}`)
    console.log(`Deployer: ${deployer}`)

    // Validate that vault contracts are deployed only on hub chain
    if (!isVaultChain(hre.network.config)) {
        throw new Error(
            `Vault contracts can only be deployed on hub chain. Network '${hre.network.name}' is configured as spoke chain (isHubChain: false). Please deploy on a hub chain.`
        )
    }

    // If ONLY_VAULT=1 is passed then the share OFT adapter deployment is skipped
    // That means we may not have a share OFT adapter to deploy to
    if (onlyDeployVault()) return

    const assetOFTAddress = await checkAddressOrGetDeployment(hre, assetToken)
    const shareOFTAdapterAddress = await checkAddressOrGetDeployment(hre, oVault.shareAdapterContractName)
    const vaultAddress = await checkAddressOrGetDeployment(hre, oVault.vault)

    const { address: composerAddress } = await deploy(oVault.composer, {
        from: deployer,
        args: [vaultAddress, assetOFTAddress, shareOFTAdapterAddress],
        log: true,
        skipIfAlreadyDeployed: true,
    })

    console.log(`Deployed contract: ${oVault.composer}, network: ${hre.network.name}, address: ${composerAddress}`)
}

deploy.tags = ['ovault', 'composer']
deploy.runAtTheEnd = true

export default deploy
