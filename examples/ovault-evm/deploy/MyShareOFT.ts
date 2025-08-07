import assert from 'assert'

import { type DeployFunction } from 'hardhat-deploy/types'

import { OVaultConfig } from '../type-extensions'

const shareOFTContractName = 'MyShareOFT'

const deploy: DeployFunction = async (hre) => {
    const { getNamedAccounts, deployments } = hre

    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    assert(deployer, 'Missing named deployer account')

    console.log(`Network: ${hre.network.name}`)
    console.log(`Deployer: ${deployer}`)

    // Get share token configuration from ovault config
    const networkConfig = hre.network.config as any
    const ovaultConfig = networkConfig.ovault as OVaultConfig

    if (!ovaultConfig) {
        throw new Error(`Missing ovault configuration for network '${hre.network.name}'`)
    }

    // Validate that standalone ShareOFT is deployed only on spoke chains
    if (ovaultConfig.isHubChain) {
        throw new Error(
            `Standalone ShareOFT can only be deployed on spoke chains. Network '${hre.network.name}' is configured as hub chain (isHubChain: true). Please deploy on a spoke chain.`
        )
    }

    const { name: tokenName, symbol: tokenSymbol } = ovaultConfig.shareToken

    const endpointV2Deployment = await hre.deployments.get('EndpointV2')

    const { address } = await deploy(shareOFTContractName, {
        from: deployer,
        args: [
            tokenName, // name
            tokenSymbol, // symbol
            endpointV2Deployment.address, // LayerZero's EndpointV2 address
            deployer, // owner
        ],
        log: true,
        skipIfAlreadyDeployed: true,
    })

    console.log(`Deployed contract: ${shareOFTContractName}, network: ${hre.network.name}, address: ${address}`)
}

deploy.tags = ['share']

export default deploy
