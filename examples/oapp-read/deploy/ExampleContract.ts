import assert from 'assert'

import { type DeployFunction } from 'hardhat-deploy/types'

const contractName = 'ExampleContract'

const deploy: DeployFunction = async (hre) => {
    const { getNamedAccounts, deployments } = hre

    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()

    assert(deployer, 'Missing named deployer account')

    console.log(`Network: ${hre.network.name}`)
    console.log(`Deployer: ${deployer}`)

    // Set initial data value - you can customize this
    const initialData = 42

    const { address } = await deploy(contractName, {
        from: deployer,
        args: [
            initialData, // Initial data value
        ],
        log: true,
        skipIfAlreadyDeployed: false,
    })

    console.log(`Deployed contract: ${contractName}, network: ${hre.network.name}, address: ${address}`)
    console.log(`Initial data value set to: ${initialData}`)
}

deploy.tags = [contractName]

export default deploy
