import assert from 'assert'

import { Wallet } from 'ethers'
import { type DeployFunction } from 'hardhat-deploy/types'

import { getNativeSpot, useBigBlock, useSmallBlock } from '@layerzerolabs/oft-hyperliquid-evm'

const contractName_adapter = 'MyHyperCoreAdapter'

const nativeSpotName = 'ALICE'

const deploy: DeployFunction = async (hre) => {
    const { getNamedAccounts, deployments } = hre

    // Validates and returns the native spot
    const hip1Token = getNativeSpot(nativeSpotName)

    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()
    assert(deployer, 'Missing named deployer account')

    const privateKey = process.env.PRIVATE_KEY_HYPERLIQUID
    assert(privateKey, 'PRIVATE_KEY_HYPERLIQUID is not set in .env file')

    // Get logger from hardhat flag --log-level
    const loglevel = hre.hardhatArguments.verbose ? 'debug' : 'error'

    const wallet = new Wallet(privateKey)
    const isTestnet = hre.network.name === 'hyperliquid-testnet'

    console.log(`Network: ${hre.network.name}`)
    console.log(`Deployer: ${deployer}`)

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
    const { address: address_oft } = await hre.deployments.get('MyHyperLiquidOFT').catch(() => {
        throw new Error('Needs MyHyperLiquidOFT to be deployed before deploying MyHyperCoreAdapter')
    })

    // Switch to hyperliquidbig block if the contract is not deployed
    const isDeployed_composer = await hre.deployments.getOrNull(contractName_adapter)

    if (!isDeployed_composer) {
        console.log(`Switching to hyperliquid big block for the address ${deployer} to deploy ${contractName_adapter}`)
        const res = await useBigBlock(wallet, isTestnet, loglevel)
        console.log(res)
        console.log(`Deplying a contract uses big block which is mined at a transaction per minute.`)
    }

    // Deploy the OFT composer
    const { address: address_hyperCoreAdapter } = await deploy(contractName_adapter, {
        from: deployer,
        args: [
            endpointV2Deployment.address, // LayerZero's EndpointV2 address
            address_oft, // OFT address
            hip1Token.nativeSpot.index, // Core index id
        ],
        log: true,
        skipIfAlreadyDeployed: true,
    })

    console.log(
        `Deployed HyperCoreAdapter contract: ${contractName_adapter}, network: ${hre.network.name}, address: ${address_hyperCoreAdapter}`
    )

    // Set small block eitherway as we do not have a method to check which hyperliquidblock we are on
    {
        console.log(`Using small block with address ${deployer} for faster transactions`)
        const res = await useSmallBlock(wallet, isTestnet, loglevel)
        console.log(JSON.stringify(res, null, 2))
    }
}

deploy.tags = [contractName_adapter]

export default deploy
