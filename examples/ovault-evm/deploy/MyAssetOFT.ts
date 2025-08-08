import assert from 'assert'

import { type DeployFunction } from 'hardhat-deploy/types'

import { assetToken } from './tokenConfig'
import { TokenDeployConfig, isContractAddress } from './types'

const deploy: DeployFunction = async (hre) => {
    const { getNamedAccounts, deployments } = hre

    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    assert(deployer, 'Missing named deployer account')

    console.log(`Network: ${hre.network.name}`)
    console.log(`Deployer: ${deployer}`)

    if (isContractAddress(assetToken)) {
        console.log(`Found pre-deployed asset address: ${assetToken}`)
        return
    }

    const { contractName, tokenName, tokenSymbol } = assetToken as TokenDeployConfig

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

deploy.tags = ['asset']

export default deploy
