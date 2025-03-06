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

    console.log(`Network: ${hre.network.name}`)
    console.log(`Deployer: ${deployer}`)

    const privateKey = process.env.PRIVATE_KEY_HYPERLIQUID
    if (!privateKey) {
        console.error('PRIVATE_KEY_HYPERLIQUID is not set in .env file')
        process.exit(1)
    }

    const wallet = new Wallet(privateKey)
    const isTestnet = hre.network.name === 'hyperliquid-testnet'
    let res = await useBigBlock(wallet, isTestnet)
    console.log(res)

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

    console.log(
        `Trying to deploy ${contractName} to ${hre.network.name}. \nDeplying a contract uses big block which is mined at a transaction per minute.`
    )
    const { address } = await deploy(contractName, {
        from: deployer,
        args: [
            'MyOFT', // name
            'MOFT', // symbol
            endpointV2Deployment.address, // LayerZero's EndpointV2 address
            deployer, // owner
        ],
        log: true,
        skipIfAlreadyDeployed: false,
    })

    console.log(`Deployed contract: ${contractName}, network: ${hre.network.name}, address: ${address}`)

    res = await useSmallBlock(wallet, isTestnet)
    console.log(res)

    exit(0)
    const nativeSpot = getNativeSpot(nativeSpots, nativeSpotName)
    const evmExtraWeiDecimals = evmDecimals - nativeSpot.weiDecimals

    await requestEvmContract(
        wallet,
        hre.network.name === 'hyperliquid-mainnet',
        address,
        evmExtraWeiDecimals,
        nativeSpot.index
    )
}

deploy.tags = [contractName]

export default deploy
