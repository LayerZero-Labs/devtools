import assert from 'assert'

import { type DeployFunction } from 'hardhat-deploy/types'

const contractName = 'AaveV3Composer'

const deploy: DeployFunction = async (hre) => {
    const { deployments, getNamedAccounts, ethers, network } = hre
    const { deploy } = deployments

    const { deployer } = await getNamedAccounts()
    assert(deployer, 'Missing named deployer account')

    const aavePool = process.env.AAVE_V3_POOL_ADDRESS
    assert(aavePool, 'Missing AAVE_V3_POOL_ADDRESS environment variable')

    const stargatePool = process.env.STARGATE_POOL_ADDRESS
    assert(stargatePool, 'Missing STARGATE_POOL_ADDRESS environment variable')

    const { isAddress } = ethers.utils
    assert(isAddress(aavePool), `AAVE_V3_POOL_ADDRESS (${aavePool}) is not a valid address`)
    assert(isAddress(stargatePool), `STARGATE_POOL_ADDRESS (${stargatePool}) is not a valid address`)

    console.log(`Network: ${network.name}`)
    console.log(`Deployer: ${deployer}`)
    console.log(`Aave pool: ${aavePool}`)
    console.log(`Stargate pool: ${stargatePool}`)

    const { address } = await deploy(contractName, {
        from: deployer,
        args: [aavePool, stargatePool],
        log: true,
        skipIfAlreadyDeployed: false,
    })

    console.log(`Deployed contract: ${contractName}, network: ${network.name}, address: ${address}`)
}

deploy.tags = [contractName]

export default deploy
