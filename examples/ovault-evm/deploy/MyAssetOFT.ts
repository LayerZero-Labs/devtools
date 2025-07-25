import assert from 'assert'

import { type DeployFunction } from 'hardhat-deploy/types'

export const assetOFTContractName = 'MyAssetOFT'
const tokenName = 'MyMockAssetOFT'
const tokenSymbol = 'MockAsset'

const deploy: DeployFunction = async (hre) => {
    const { getNamedAccounts, deployments } = hre

    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    assert(deployer, 'Missing named deployer account')

    console.log(`Network: ${hre.network.name}`)
    console.log(`Deployer: ${deployer}`)

    const endpointV2Deployment = await hre.deployments.get('EndpointV2')

    const { address } = await deploy(assetOFTContractName, {
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

    console.log(`Deployed contract: ${assetOFTContractName}, network: ${hre.network.name}, address: ${address}`)
}

deploy.tags = ['asset']

export default deploy
