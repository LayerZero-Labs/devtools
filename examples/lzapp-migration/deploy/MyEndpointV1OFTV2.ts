import { ethers } from 'hardhat'
import { type DeployFunction } from 'hardhat-deploy/types'

const contractName = 'MyEndpointV1OFTV2Mock'

const deploy: DeployFunction = async ({ getNamedAccounts, deployments, network }) => {
    console.log('Deploy script started...')
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()
    console.log(`>>> your address: ${deployer}`)

    const lzEndpointAddress = (await deployments.get('Endpoint')).address // retrieved EndpointV1 address based on eid set in hardhat config

    if (!lzEndpointAddress) {
        throw new Error(`No endpoint address found for network: ${network.name}`)
    }

    const amountInEther = '1000000' // TODO: accept as param

    await deploy(contractName, {
        from: deployer,
        args: [lzEndpointAddress, ethers.utils.parseUnits(amountInEther, 18), 6],
        log: true,
        waitConfirmations: 1,
    })
}

deploy.tags = [contractName]
export default deploy
