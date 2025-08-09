import { type DeployFunction } from 'hardhat-deploy/types'

const contractName = 'SimpleExecutorMock'

const deploy: DeployFunction = async ({ getNamedAccounts, deployments, network }) => {
    console.log('Deploy script started...')
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()
    console.log(`>>> your address: ${deployer}`)

    const endpointV2Address = (await deployments.get('EndpointV2')).address
    const sendUln302Address = (await deployments.get('SendUln302')).address

    if (!endpointV2Address) {
        throw new Error(`No EndpointV2 address found for network: ${network.name}`)
    }

    if (!sendUln302Address) {
        throw new Error(`No SendUln302 address found for network: ${network.name}`)
    }

    // Build message libs array - required by the Worker contract
    const messageLibs = [sendUln302Address]

    const result = await deploy(contractName, {
        from: deployer,
        args: [
            endpointV2Address, // _endpoint
            messageLibs, // _messageLibs
        ],
        log: true,
        waitConfirmations: 1,
    })

    console.log(`✅ ${contractName} deployed at: ${result.address}`)
}

deploy.tags = [contractName]
export default deploy
