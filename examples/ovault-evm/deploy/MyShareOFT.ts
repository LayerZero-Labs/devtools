import assert from 'assert'

import { type DeployFunction } from 'hardhat-deploy/types'

import { ovaultContractName } from './MyERC4626'

const shareOFTContractName = 'MyShareOFT'
const tokenName = 'MyShareOFT'
const tokenSymbol = 'SHARE'

const deploy: DeployFunction = async (hre) => {
    const { getNamedAccounts, deployments } = hre

    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    assert(deployer, 'Missing named deployer account')

    console.log(`Network: ${hre.network.name}`)
    console.log(`Deployer: ${deployer}`)

    const ovaultDeployment = await hre.deployments.getOrNull(ovaultContractName)
    if (ovaultDeployment) {
        throw new Error(
            `OVault contract deployed on network ${hre.network.name}. This network can only support ShareOFTAdapter`
        )
    }

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
