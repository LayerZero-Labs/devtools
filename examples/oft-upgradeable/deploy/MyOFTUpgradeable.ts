import { type DeployFunction } from 'hardhat-deploy/types'

const contractName = 'MyOFTUpgradeable'

const deploy: DeployFunction = async (hre) => {
    const { deploy } = hre.deployments
    const signer = (await hre.ethers.getSigners())[0]
    console.log(`deploying ${contractName} on network: ${hre.network.name} with ${signer.address}`)

    const endpointV2Deployment = await hre.deployments.get('EndpointV2')
    const existing = await hre.ethers.getContract('MyOFTUpgradeable')
    console.log(`Proxy: ${existing.address}`)

    await deploy(contractName, {
        from: signer.address,
        args: [endpointV2Deployment.address],
        log: true,
        waitConfirmations: 1,
        skipIfAlreadyDeployed: false,
        proxy: {
            checkABIConflict: false,
            owner: signer.address,
            execute: {
                init: {
                    methodName: 'initialize',
                    args: ['MyOFT', 'MOFT', signer.address], // TODO: add name/symbol
                },
            },
        },
    })
}

deploy.tags = [contractName]

export default deploy
