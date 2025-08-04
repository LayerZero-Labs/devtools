import assert from 'assert'

import { type DeployFunction } from 'hardhat-deploy/types'

import { assetOFTContractName } from './MyAssetOFT'

export const ovaultContractName = 'MyERC4626'
const tokenName = 'MyShareOFT'
const tokenSymbol = 'SHARE'

const shareOFTAdapterContractName = 'MyShareOFTAdapter'
const composerContractName = 'MyOVaultComposer'

const deploy: DeployFunction = async (hre) => {
    const { getNamedAccounts, deployments } = hre

    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    assert(deployer, 'Missing named deployer account')

    console.log(`Network: ${hre.network.name}`)
    console.log(`Deployer: ${deployer}`)

    const assetOFTDeployment = await hre.deployments.get(assetOFTContractName)

    const { address: ovaultAddress } = await deploy(ovaultContractName, {
        from: deployer,
        args: [tokenName, tokenSymbol, assetOFTDeployment.address],
        log: true,
        skipIfAlreadyDeployed: true,
    })

    console.log(`Deployed contract: ${ovaultContractName}, network: ${hre.network.name}, address: ${ovaultAddress}`)

    const endpointV2Deployment = await hre.deployments.get('EndpointV2')

    const { address: shareOFTAdapterAddress } = await deploy(shareOFTAdapterContractName, {
        from: deployer,
        args: [ovaultAddress, endpointV2Deployment.address, deployer],
        log: true,
        skipIfAlreadyDeployed: true,
    })

    console.log(
        `Deployed contract: ${shareOFTAdapterContractName}, network: ${hre.network.name}, address: ${shareOFTAdapterAddress}`
    )

    const { address: composerAddress } = await deploy(composerContractName, {
        from: deployer,
        args: [ovaultAddress, assetOFTDeployment.address, shareOFTAdapterAddress],
        log: true,
        skipIfAlreadyDeployed: true,
    })

    console.log(`Deployed contract: ${composerContractName}, network: ${hre.network.name}, address: ${composerAddress}`)
}

deploy.tags = ['ovault']

export default deploy
