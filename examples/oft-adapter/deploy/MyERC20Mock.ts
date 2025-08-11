import assert from 'assert'

import { type DeployFunction } from 'hardhat-deploy/types'

const contractName = 'MyERC20Mock'

const deploy: DeployFunction = async (hre) => {
    const { getNamedAccounts, deployments } = hre

    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    assert(deployer, 'Missing named deployer account')

    console.log(`Network: ${hre.network.name}`)
    console.log(`Deployer: ${deployer}`)

    // Token configuration
    const tokenName = 'My ERC20 Mock'
    const tokenSymbol = 'MERC20'
    const initialMintAmount = hre.ethers.utils.parseEther('10') // 10 tokens

    const { address } = await deploy(contractName, {
        from: deployer,
        args: [
            tokenName, // Token name
            tokenSymbol, // Token symbol
        ],
        log: true,
        skipIfAlreadyDeployed: false,
    })

    console.log(`Deployed contract: ${contractName}, network: ${hre.network.name}, address: ${address}`)
    console.log(`Token: ${tokenName} (${tokenSymbol})`)

    // Mint initial tokens to the deployer
    const [signer] = await hre.ethers.getSigners()
    const innerToken = await hre.ethers.getContractAt(contractName, address, signer)

    const mintTx = await innerToken.mint(deployer, initialMintAmount)
    await mintTx.wait()

    const balance = await innerToken.balanceOf(deployer)
    console.log(`Minted ${hre.ethers.utils.formatEther(balance)} ${tokenSymbol} tokens to deployer: ${deployer}`)
}

deploy.tags = [contractName]

export default deploy
