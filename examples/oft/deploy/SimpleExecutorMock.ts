import { type DeployFunction } from 'hardhat-deploy/types'

const contractName = 'SimpleExecutorMock'

const deploy: DeployFunction = async ({ getNamedAccounts, deployments, network }) => {
    console.log('Deploy script started...')
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()
    console.log(`>>> your address: ${deployer}`)

    const endpointV2Address = (await deployments.get('EndpointV2')).address
    const sendUln302Address = (await deployments.get('SendUln302')).address
    const receiveUln302Address = (await deployments.get('ReceiveUln302')).address
    const receiveUln302ViewAddress = (await deployments.get('ReceiveUln302View')).address

    if (!endpointV2Address) {
        throw new Error(`No EndpointV2 address found for network: ${network.name}`)
    }

    if (!sendUln302Address) {
        throw new Error(`No SendUln302 address found for network: ${network.name}`)
    }

    if (!receiveUln302Address) {
        throw new Error(`No ReceiveUln302 address found for network: ${network.name}`)
    }

    if (!receiveUln302ViewAddress) {
        throw new Error(`No ReceiveUln302View address found for network: ${network.name}`)
    }

    // Create array of message libraries that can assign jobs
    const messageLibs = [sendUln302Address]

    const result = await deploy(contractName, {
        from: deployer,
        args: [
            endpointV2Address, // _endpoint
            messageLibs, // _messageLibs array
            receiveUln302Address, // _receiveUln302
            receiveUln302ViewAddress, // _receiveUln302View
        ],
        log: true,
        waitConfirmations: 1,
    })

    console.log(`✅ ${contractName} on ${network.name} deployed at: ${result.address}`)
}

deploy.tags = [contractName]
deploy.dependencies = ['EndpointV2', 'SendUln302', 'ReceiveUln302', 'ReceiveUln302View']

export default deploy
