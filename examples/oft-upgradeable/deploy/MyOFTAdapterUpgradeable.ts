import { type DeployFunction } from 'hardhat-deploy/types'

const contractName = 'MyOFTAdapterUpgradeable'

const deploy: DeployFunction = async (hre) => {
    const { deploy } = hre.deployments
    const signer = (await hre.ethers.getSigners())[0]
    console.log(`deploying ${contractName} on network: ${hre.network.name} with ${signer.address}`)

    const endpointV2Deployment = await hre.deployments.get('EndpointV2')
    try {
        const proxy = await hre.ethers.getContract('MyOFTUpgradeable')
        console.log(`Proxy: ${proxy.address}`)
    } catch (e) {
        console.log(`Proxy not found`)
    }

    await deploy(contractName, {
        from: signer.address,
        args: ['0x', endpointV2Deployment.address], // replace '0x' with the address of the ERC-20 token
        log: true,
        waitConfirmations: 1,
        skipIfAlreadyDeployed: false,
        proxy: {
            checkABIConflict: false,
            owner: signer.address,
            execute: {
                init: {
                    methodName: 'initialize',
                    args: [signer.address],
                },
            },
        },
    })
}

deploy.tags = [contractName]

export default deploy
