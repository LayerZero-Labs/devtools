// 01_deploy_mint_burn_token.ts

import assert from 'assert'
import { type DeployFunction } from 'hardhat-deploy/types'
import { parseEther, formatEther } from 'ethers/lib/utils' // Directly import required Ethers utilities

const CONTRACT_NAME = 'MintBurnERC20Mock'

/**
 * @title Deploy and Initialize MintBurnERC20Mock
 * @notice Deploys the mock ERC20 token and mints an initial supply to the deployer.
 */
const deployScript: DeployFunction = async (hre) => {
    // Destructure required objects directly from the Hardhat Runtime Environment (hre)
    const { getNamedAccounts, deployments, ethers, network } = hre
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    assert(deployer, 'Error: Named deployer account is missing.')

    console.log(`\n--- Deployment Details ---`)
    console.log(`Network: ${network.name}`)
    console.log(`Deployer Address: ${deployer}`)

    // --- Token Configuration ---
    const tokenName = 'Mock Mint Burn Token'
    const tokenSymbol = 'MMBT'
    // Use parseEther helper from Ethers utilities for clarity
    const initialMintAmount = parseEther('1000000') // 1,000,000 tokens

    // --- Contract Deployment ---
    const deploymentResult = await deploy(CONTRACT_NAME, {
        from: deployer,
        args: [
            tokenName,   // Token name
            tokenSymbol, // Token symbol
        ],
        log: true, // Log transaction details and address to console
        skipIfAlreadyDeployed: false,
    })

    console.log(`Deployed Contract: ${CONTRACT_NAME}`)
    console.log(`Contract Address: ${deploymentResult.address}`)

    // --- Initial Minting ---
    
    // Get the Contract instance, connected to the deployer account (signer)
    const mintBurnToken = await ethers.getContractAt(
        CONTRACT_NAME, 
        deploymentResult.address, 
        await ethers.getSigner(deployer) // Explicitly get signer for the deployer address
    )

    console.log(`Attempting to mint ${formatEther(initialMintAmount)} ${tokenSymbol} to deployer...`)

    const mintTx = await mintBurnToken.mint(deployer, initialMintAmount)
    await mintTx.wait()

    // --- Verification ---
    const balance = await mintBurnToken.balanceOf(deployer)

    console.log(`✅ Minting successful.`)
    console.log(`Deployer Balance: ${formatEther(balance)} ${tokenSymbol}`)
}

// Hardhat Deploy tags
deployScript.tags = [CONTRACT_NAME, 'MOCK']

export default deployScript
