import assert from 'assert'

import { Wallet } from 'ethers'
import { type DeployFunction } from 'hardhat-deploy/types'
import inquirer from 'inquirer'

import { CHAIN_IDS, getCoreSpotDeployment, useBigBlock, useSmallBlock } from '@layerzerolabs/hyperliquid-composer'

const contractName_oft = 'MyOFT'
const contractName_composer = 'MyHyperLiquidComposer_FeeAbstraction'

const deploy: DeployFunction = async (hre) => {
    const { coreSpotIndex } = await inquirer.prompt([
        {
            type: 'input',
            name: 'coreSpotIndex',
            message: 'Enter the core spot index from deployments that you would like to use',
        },
    ])

    const { spotId } = await inquirer.prompt([
        {
            type: 'input',
            name: 'spotId',
            message: 'Enter the spot pair ID for price queries (e.g., 107 for HYPE/USDC)',
        },
    ])

    const { activationOverheadFee } = await inquirer.prompt([
        {
            type: 'input',
            name: 'activationOverheadFee',
            message: 'Enter activation overhead fee in cents (e.g., 100 = $1.00 overhead on top of $1.00 base)',
            default: '100',
        },
    ])

    const { getNamedAccounts, deployments } = hre

    const { deploy } = deployments
    const { deployer, recovery: recoveryAddress } = await getNamedAccounts()
    assert(deployer, 'Missing named deployer account')
    assert(recoveryAddress, 'Missing recovery address. Please set RECOVERY_ADDRESS in .env file')

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
    console.log(`Recovery Address: ${recoveryAddress}`)
    console.log(`Spot ID: ${spotId}`)
    console.log(`Activation Overhead Fee: ${activationOverheadFee} cents`)

    assert(isHyperliquid, 'The hyperliquid composer is only supported on hyperliquid networks')

    // Validates and returns the native spot
    const hip1Token = getCoreSpotDeployment(coreSpotIndex, isTestnet)

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

            return { address: oftAddress }
        } else {
            throw new Error(`Needs ${contractName_oft} to be deployed before deploying MyHyperLiquidComposer`)
        }
    })
    console.log('address_oft', address_oft)
    if (!hre.ethers.utils.isAddress(address_oft)) {
        throw new Error(`Input address ${address_oft} is not a valid address`)
    }

    // Switch to hyperliquid big block if the contract is not deployed
    const isDeployed_composer = await hre.deployments.getOrNull(contractName_composer)

    if (!isDeployed_composer) {
        console.log(`Switching to hyperliquid big block for the address ${deployer} to deploy ${contractName_composer}`)
        const res = await useBigBlock(wallet, isTestnet, loglevel)
        console.log(res)
        console.log(`Deplying a contract uses big block which is mined at a transaction per minute.`)
    }

    // Deploy the OFT composer with FeeAbstraction extension
    const { address: address_composer } = await deploy(contractName_composer, {
        from: deployer,
        args: [
            address_oft, // OFT address
            hip1Token.coreSpot.index, // Core index id
            hip1Token.txData.weiDiff, // Asset decimal difference
            parseInt(spotId), // Spot pair ID for price queries
            parseInt(activationOverheadFee), // Activation overhead fee in cents
            recoveryAddress, // Recovery address for fee management
        ],
        log: true,
        skipIfAlreadyDeployed: false,
    })

    console.log(
        `Deployed HyperliquidComposer with FeeAbstraction: ${contractName_composer}, network: ${hre.network.name}, address: ${address_composer}`
    )
    console.log(`  - Spot ID: ${spotId}`)
    console.log(
        `  - Overhead Fee: ${activationOverheadFee} cents (Total fee: $${(100 + parseInt(activationOverheadFee)) / 100})`
    )
    console.log(`  - Recovery Address: ${recoveryAddress}`)

    // Set small block eitherway as we do not have a method to check which hyperliquidblock we are on
    {
        console.log(`Using small block with address ${deployer} for faster transactions`)
        const res = await useSmallBlock(wallet, isTestnet, loglevel)
        console.log(JSON.stringify(res, null, 2))
    }
}

deploy.tags = [contractName_composer]

export default deploy
