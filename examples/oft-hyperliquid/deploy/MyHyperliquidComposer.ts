import assert from 'assert'

import { Wallet } from 'ethers'
import { type DeployFunction } from 'hardhat-deploy/types'
import inquirer from 'inquirer'

import { CHAIN_IDS, getCoreSpotDeployment, useBigBlock, useSmallBlock } from '@layerzerolabs/hyperliquid-composer'

const contractName_oft = 'MyOFT'
const contractName_composer = 'MyHyperLiquidComposer'

const deploy: DeployFunction = async (hre) => {
    const { coreSpotIndex } = await inquirer.prompt([
        {
            type: 'input',
            name: 'coreSpotIndex',
            message: 'Enter the core spot index from deployments that you would like to use',
        },
    ])

    const { getNamedAccounts, deployments } = hre

    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()
    assert(deployer, 'Missing named deployer account')

    const networkName = hre.network.name
    const privateKey = hre.network.config.accounts
    assert(
        privateKey,
        `Can not find a private key associated with hre.network.config.accounts for the network ${networkName} in hardhat.config.ts`
    )

    // Get logger from hardhat flag --log-level
    const loglevel = hre.hardhatArguments.verbose ? 'debug' : 'error'

    const wallet = new Wallet(privateKey.toString())
    const chainId = (await hre.ethers.provider.getNetwork()).chainId
    const isHyperliquid = chainId === CHAIN_IDS.MAINNET || chainId === CHAIN_IDS.TESTNET
    const isTestnet = chainId === CHAIN_IDS.TESTNET

    console.log(`Network: ${networkName}`)
    console.log(`Deployer: ${deployer}`)

    assert(isHyperliquid, 'The hyperliquid composer is only supported on hyperliquid networks')

    // Validates and returns the native spot
    const hip1Token = getCoreSpotDeployment(coreSpotIndex, isTestnet)

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
    const { address: address_oft } = await hre.deployments.get(contractName_oft).catch(async () => {
        console.log(`Deployment file for ${contractName_oft}.json in deployments/${networkName} not found`)
        const { proceedWithOFTAddress } = await inquirer.prompt([
            {
                type: 'input',
                name: 'proceedWithOFTAddress',
                message: 'Do you have an OFT address that you would like to use? (y/n)',
            },
        ])
        if (proceedWithOFTAddress) {
            const { oftAddress } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'oftAddress',
                    message: 'Please enter the OFT you would like the composer to be associated with:',
                },
            ])

            return oftAddress
        } else {
            throw new Error(`Needs ${contractName_oft} to be deployed before deploying MyHyperLiquidComposer`)
        }
    })

    if (!hre.ethers.utils.isAddress(address_oft)) {
        throw new Error(`Input address ${address_oft} is not a valid address`)
    }
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
            hip1Token.coreSpot.index, // Core index id
            hip1Token.txData.weiDiff,
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
