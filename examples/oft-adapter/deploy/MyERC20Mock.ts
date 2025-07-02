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

    // Deploy the mock ERC20 token
    // This is typically used as the "inner token" for OFT Adapter testing
    const { address } = await deploy(contractName, {
        from: deployer,
        args: [
            'MyERC20Mock', // name
            'MERC20', // symbol
        ],
        log: true,
        skipIfAlreadyDeployed: false,
    })

    console.log(`Deployed contract: ${contractName}, network: ${hre.network.name}, address: ${address}`)
    console.log(`Use this address as the tokenAddress in your oftAdapter network configuration:`)
    console.log(`oftAdapter: { tokenAddress: '${address}' }`)
}

deploy.tags = [contractName]

export default deploy
