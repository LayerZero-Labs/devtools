import assert from 'assert'

import { type DeployFunction } from 'hardhat-deploy/types'

// TODO declare your contract name here
const contractName = 'MyLzApp'

const deploy: DeployFunction = async (hre) => {
    const { getNamedAccounts, deployments } = hre

    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    assert(deployer, 'Missing named deployer account')

    console.log(`Network: ${hre.network.name}`)
    console.log(`Deployer: ${deployer}`)

    // This is an external deployment pulled in from @layerzerolabs/lz-evm-sdk-v1
    //
    // @layerzerolabs/toolbox-hardhat takes care of plugging in the external deployments
    // from @layerzerolabs packages based on the configuration in your hardhat config
    //
    // For this to work correctly, your network config must define an eid property
    // set to `EndpointId` as defined in @layerzerolabs/lz-definitions
    //
    // For example:
    //
    // networks: {
    //   fuji: {
    //     ...
    //     eid: EndpointId.AVALANCHE_TESTNET
    //   }
    // }
    const endpointV1Deployment = await hre.deployments.get('Endpoint')

    const { address } = await deploy(contractName, {
        from: deployer,
        args: [
            endpointV1Deployment.address, // LayerZero's EndpointV1 address
            //deployer, // owner // not passing owner to simulate EndpointV1 OFT's usage of openzeppelin v4
        ],
        log: true,
        skipIfAlreadyDeployed: false,
    })

    console.log(`Deployed contract: ${contractName}, network: ${hre.network.name}, address: ${address}`)
}

deploy.tags = [contractName]

export default deploy
