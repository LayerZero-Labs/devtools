import assert from 'assert'

import { Wallet } from 'ethers'
import { type DeployFunction } from 'hardhat-deploy/types'

import { CHAIN_IDS, useBigBlock, useSmallBlock } from '@layerzerolabs/hyperliquid-composer'

const contractName_oft = 'MyOFT'
const tokenSymbol = 'MYOFT'

const deploy: DeployFunction = async (hre) => {
    const { getNamedAccounts, deployments } = hre

    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()
    assert(deployer, 'Missing named deployer account')

    const networkName = hre.network.name
    // Grab the private key used to deploy to this network from hardhat.config.ts -> networks -> networkName -> accounts
    const privateKey = hre.network.config.accounts
    assert(
        privateKey,
        `Can not find a private key associated with hre.network.config.accounts for the network ${networkName} in hardhat.config.ts`
    )

    // Get logger from hardhat flag --log-level
    const loglevel = hre.hardhatArguments.verbose ? 'debug' : 'info'

    const wallet = new Wallet(privateKey.toString())

    const chainId = (await hre.ethers.provider.getNetwork()).chainId
    const isHyperliquid = chainId === CHAIN_IDS.MAINNET || chainId === CHAIN_IDS.TESTNET
    const isTestnet = chainId === CHAIN_IDS.TESTNET

    console.log(`Network: ${networkName}`)
    console.log(`Deployer: ${deployer}`)

    if (isHyperliquid) {
        console.log('This deploys to hyperliquid networks')
    }

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

    if (!isDeployed_oft && isHyperliquid) {
        console.log(`Switching to hyperliquid big block for the address ${deployer} to deploy ${contractName_oft}`)
        const res = await useBigBlock(wallet, isTestnet, loglevel, true)
        console.log(JSON.stringify(res, null, 2))
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
    if (isHyperliquid) {
        console.log(`Using small block with address ${deployer} for faster transactions`)
        const res = await useSmallBlock(wallet, isTestnet, loglevel, true)
        console.log(JSON.stringify(res, null, 2))
    }
}

// MyHyperLiquidOFT
deploy.tags = [`${contractName_oft}`]

export default deploy
