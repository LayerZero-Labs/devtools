import assert from 'assert'
import { exit } from 'process'

import { Wallet } from 'ethers'
import { type DeployFunction } from 'hardhat-deploy/types'

import { getNativeSpot, requestEvmContract, useBigBlock, useSmallBlock } from '@layerzerolabs/oft-hyperliquid-evm'

import { nativeSpots } from './nativeSpot'

const contractName = 'MyOFT'
const evmDecimals = 18
const nativeSpotName = 'ALICE'

const deploy: DeployFunction = async (hre) => {
    const { getNamedAccounts, deployments } = hre

    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    assert(deployer, 'Missing named deployer account')

    const privateKey = process.env.PRIVATE_KEY_HYPERLIQUID
    if (!privateKey) {
        console.error('PRIVATE_KEY_HYPERLIQUID is not set in .env file')
        process.exit(1)
    }

    const wallet = new Wallet(privateKey)
    const isTestnet = hre.network.name === 'hyperliquid-testnet'

    console.log(`Network: ${hre.network.name}`)
    console.log(`Deployer: ${deployer}`)

    // Get logger from hardhat flag --log-level
    const loglevel = hre.hardhatArguments.verbose ? 'debug' : 'info'
    console.log(`Log level: ${loglevel}`)

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
    const isDeployed = await hre.deployments.get(contractName)
    if (!isDeployed) {
        console.log(
            `Contract ${contractName} is not deployed - switching to hyperliquid big block for the address ${deployer}`
        )
        const res = await useBigBlock(wallet, isTestnet, loglevel)
        console.log(res)
        console.log(
            `Trying to deploy ${contractName} to ${hre.network.name}. \nDeplying a contract uses big block which is mined at a transaction per minute.`
        )
    }

    const { address } = await deploy(contractName, {
        from: deployer,
        args: [
            'MyOFT', // name
            'MOFT', // symbol
            endpointV2Deployment.address, // LayerZero's EndpointV2 address
            deployer, // owner
        ],
        log: true,
        skipIfAlreadyDeployed: true,
    })

    console.log(`Deployed contract: ${contractName}, network: ${hre.network.name}, address: ${address}`)

    // Set small block eitherway as we do not have a method to check which hyperliquidblock we are on
    console.log(`Using small block with address ${address} for faster transactions`)
    const res = await useSmallBlock(wallet, isTestnet, loglevel)
    console.log(JSON.stringify(res, null, 2))

    exit(0)
    const nativeSpot = getNativeSpot(nativeSpots, nativeSpotName)
    const evmExtraWeiDecimals = evmDecimals - nativeSpot.weiDecimals

    await requestEvmContract(
        wallet,
        hre.network.name === 'hyperliquid-mainnet',
        address,
        evmExtraWeiDecimals,
        nativeSpot.index,
        loglevel
    )
}

deploy.tags = [contractName]

export default deploy
