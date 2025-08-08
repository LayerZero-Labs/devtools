import assert from 'assert'

import { type DeployFunction } from 'hardhat-deploy/types'

import { shareToken } from './tokenConfig'
import { TokenDeployConfig, isContractAddress, isVaultChain } from './types'

const deploy: DeployFunction = async (hre) => {
    const { getNamedAccounts, deployments } = hre

    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    assert(deployer, 'Missing named deployer account')

    console.log(`Network: ${hre.network.name}`)
    console.log(`Deployer: ${deployer}`)

    // Get share token configuration from ovault config
    if (isVaultChain(hre.network.config)) {
        console.error(`Skipping ShareOFT deployment on vault network since it needs an OFTAdapter`)
        return
    }

    if (isContractAddress(shareToken)) {
        throw new Error(`Found contract address for share token. Expected TokenDeployConfig. Found: ${shareToken}`)
    }

    const { contractName, tokenName, tokenSymbol } = shareToken as TokenDeployConfig

    const endpointV2Deployment = await hre.deployments.get('EndpointV2')

    const { address } = await deploy(contractName, {
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

    console.log(`Deployed contract: ${contractName}, network: ${hre.network.name}, address: ${address}`)
}

deploy.tags = ['share']

export default deploy
