import assert from 'assert'

import { type DeployFunction } from 'hardhat-deploy/types'

const contractName_oft = 'MyHyperLiquidOFT'
const tokenSymbol = 'MHLOFT'

const deploy: DeployFunction = async (hre) => {
    const { getNamedAccounts, deployments } = hre

    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()
    assert(deployer, 'Missing named deployer account')

    const networkName = hre.network.name
    console.log(`Network: ${networkName}`)

    assert(
        networkName != 'hyperliquid-testnet' && networkName != 'hyperliquid-mainnet',
        'This deploys to non hyperliquid networks'
    )

    // This is an external deployment pulled in from @layerzerolabs/lz-evm-sdk-v2
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
    //     eid: EndpointId.AVALANCHE_V2_TESTNET
    //   }
    // }
    const endpointV2Deployment = await hre.deployments.get('EndpointV2')

    // Deploy the OFT on HyperEVM
    const { address: address_oft, transactionHash } = await deploy(contractName_oft, {
        from: deployer,
        args: [
            contractName_oft, // name
            tokenSymbol, // symbol
            endpointV2Deployment.address, // LayerZero's EndpointV2 address
            deployer, // owner
        ],
        log: true,
        skipIfAlreadyDeployed: true,
    })

    console.log(
        `Deployed OFT contract: ${contractName_oft}, network: ${hre.network.name}, \n address: ${address_oft} @ tx-hash: ${transactionHash}`
    )
}

// MyHyperLiquidOFT-vanilla
deploy.tags = [`${contractName_oft}-vanilla`]

export default deploy
