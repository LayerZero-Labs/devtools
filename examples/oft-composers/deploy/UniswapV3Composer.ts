import assert from 'assert'

import { type DeployFunction } from 'hardhat-deploy/types'

const contractName = 'UniswapV3Composer'

const deploy: DeployFunction = async (hre) => {
    const { deployments, getNamedAccounts, ethers, network } = hre
    const { deploy } = deployments

    const { deployer } = await getNamedAccounts()
    assert(deployer, 'Missing named deployer account')

    const swapRouter = process.env.SWAP_ROUTER_ADDRESS
    assert(swapRouter, 'Missing SWAP_ROUTER_ADDRESS environment variable')

    const oft = process.env.OFT_ADDRESS
    assert(oft, 'Missing OFT_ADDRESS environment variable')

    const { isAddress } = ethers.utils
    assert(isAddress(swapRouter), `SWAP_ROUTER_ADDRESS (${swapRouter}) is not a valid address`)
    assert(isAddress(oft), `OFT_ADDRESS (${oft}) is not a valid address`)

    console.log(`Network: ${network.name}`)
    console.log(`Deployer: ${deployer}`)
    console.log(`Swap router: ${swapRouter}`)
    console.log(`OFT: ${oft}`)

    const { address } = await deploy(contractName, {
        from: deployer,
        args: [swapRouter, oft],
        log: true,
        skipIfAlreadyDeployed: false,
    })

    console.log(`Deployed contract: ${contractName}, network: ${network.name}, address: ${address}`)
}

deploy.tags = [contractName]

export default deploy
