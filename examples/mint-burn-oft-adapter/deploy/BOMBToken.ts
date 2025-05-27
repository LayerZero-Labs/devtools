import assert from 'assert'

import { type DeployFunction } from 'hardhat-deploy/types'

const contractName = 'BOMBToken'

const deploy: DeployFunction = async (hre) => {
    const { getNamedAccounts, deployments } = hre

    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    assert(deployer, 'Missing named deployer account')

    console.log(`Network: ${hre.network.name}`)
    console.log(`Deployer: ${deployer}`)

    // Deploy the BOMBToken contract
    // Constructor: ERC20Permit(NAME), ERC20(NAME, SYMBOL), AccessControlDefaultAdminRules(3 days, msg.sender)
    // NAME and SYMBOL are constants in the contract, so no args needed for those
    // Only argument needed is the admin address (msg.sender)
    const { address } = await deploy(contractName, {
        from: deployer,
        args: [], // No constructor args needed, msg.sender is set automatically
        log: true,
        skipIfAlreadyDeployed: false,
    })

    console.log(`Deployed contract: ${contractName}, network: ${hre.network.name}, address: ${address}`)
}

deploy.tags = [contractName]

export default deploy
