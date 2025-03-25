import assert from 'assert'

import { Wallet } from 'ethers'
import { type DeployFunction } from 'hardhat-deploy/types'

import { getNativeSpot, useBigBlock, useSmallBlock } from '@layerzerolabs/oft-hyperliquid-evm'

const contractName_oft = 'MyHyperLiquidOFT'
const contractName_composer = 'MyHyperLiquidComposer'

const evmDecimals = 0
const nativeSpotName = ''

const deploy: DeployFunction = async (hre) => {
    assert(nativeSpotName != '', 'nativeSpotName needs to be set in deploy/MyHyperLiquidComposer.ts')
    assert(evmDecimals != 0, 'evmDecimals needs to be set in deploy/MyHyperLiquidComposer.ts')
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

    const evmExtraWeiDecimals = evmDecimals - hip1Token.nativeSpot.weiDecimals

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
    const { address: address_oft } = await hre.deployments.get(contractName_oft).catch(() => {
        throw new Error('Needs MyHyperLiquidOFT to be deployed before deploying MyHyperLiquidComposer')
    })

    // Switch to hyperliquidbig block if the contract is not deployed
    const isDeployed_composer = await hre.deployments.getOrNull(contractName_composer)

    if (!isDeployed_composer) {
        console.log(`Switching to hyperliquid big block for the address ${deployer} to deploy ${contractName_composer}`)
        const res = await useBigBlock(wallet, isTestnet, loglevel)
        console.log(res)
        console.log(`Deplying a contract uses big block which is mined at a transaction per minute.`)
    }

    // Deploy the OFT composer
    const { address: address_composer } = await deploy(contractName_composer, {
        from: deployer,
        args: [
            endpointV2Deployment.address, // LayerZero's EndpointV2 address
            address_oft, // OFT address
            hip1Token.nativeSpot.index, // Core index id
            evmExtraWeiDecimals,
        ],
        log: true,
        skipIfAlreadyDeployed: false,
    })

    console.log(
        `Deployed HyperliquidComposer contract: ${contractName_composer}, network: ${hre.network.name}, address: ${address_composer}`
    )

    // Set small block eitherway as we do not have a method to check which hyperliquidblock we are on
    {
        console.log(`Using small block with address ${deployer} for faster transactions`)
        const res = await useSmallBlock(wallet, isTestnet, loglevel)
        console.log(JSON.stringify(res, null, 2))
    }
}

deploy.tags = [contractName_composer]

export default deploy
