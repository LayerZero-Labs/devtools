import assert from 'assert'

import { Wallet } from 'ethers'
import { type DeployFunction } from 'hardhat-deploy/types'

import { useBigBlock, useSmallBlock } from '@layerzerolabs/oft-hyperliquid-evm'

const contractName_oft = 'MyHyperLiquidOFT'
const tokenSymbol = 'MYOFT'

const deploy: DeployFunction = async (hre) => {
    const { getNamedAccounts, deployments } = hre

    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()
    assert(deployer, 'Missing named deployer account')

    const privateKey = process.env.PRIVATE_KEY_HYPERLIQUID
    assert(privateKey, 'PRIVATE_KEY_HYPERLIQUID is not set in .env file')

    // Get logger from hardhat flag --log-level
    const loglevel = hre.hardhatArguments.verbose ? 'debug' : 'info'

    const wallet = new Wallet(privateKey)
    const isTestnet = hre.network.name === 'hyperliquid-testnet'

    const networkName = hre.network.name
    console.log(`Network: ${networkName}`)
    console.log(`Deployer: ${deployer}`)

    assert(
        networkName === 'hyperliquid-testnet' || networkName === 'hyperliquid-mainnet',
        'This deploys to hyperliquid networks'
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

    // Switch to hyperliquidbig block if the contract is not deployed
    const isDeployed_oft = await hre.deployments.getOrNull(contractName_oft)

    if (!isDeployed_oft) {
        console.log(`Switching to hyperliquid big block for the address ${deployer} to deploy ${contractName_oft}`)
        await useBigBlock(wallet, isTestnet, loglevel)
        console.log(`Deplying a contract uses big block which is mined at a transaction per minute.`)
    }

    // Deploy the OFT on HyperEVM
    const { address: address_oft } = await deploy(contractName_oft, {
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

    console.log(`Deployed OFT contract: ${contractName_oft}, network: ${hre.network.name}, address: ${address_oft}`)

    // Set small block eitherway as we do not have a method to check which hyperliquidblock we are on
    {
        console.log(`Using small block with address ${deployer} for faster transactions`)
        const res = await useSmallBlock(wallet, isTestnet, loglevel)
        console.log(JSON.stringify(res, null, 2))
    }
}

// MyHyperLiquidOFT
deploy.tags = [`${contractName_oft}`]

export default deploy
