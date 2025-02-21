import { type DeployFunction } from 'hardhat-deploy/types'

import { EndpointId, getNetworkForChainId } from '@layerzerolabs/lz-definitions'
import { getDeploymentAddressAndAbi } from '@layerzerolabs/lz-evm-sdk-v2'

const contractName = 'MyOFTUpgradeable'

const deploy: DeployFunction = async (hre) => {
    const { deploy } = hre.deployments
    const signer = (await hre.ethers.getSigners())[0]
    console.log(`deploying ${contractName} on network: ${hre.network.name} with ${signer.address}`)

    const eid = hre.network.config.eid as EndpointId
    const networkStage = getNetworkForChainId(eid)
    const lzNetworkName = `${networkStage.chainName}-${networkStage.env}`

    const { address } = getDeploymentAddressAndAbi(lzNetworkName, 'EndpointV2')

    await deploy(contractName, {
        from: signer.address,
        args: [address],
        log: true,
        waitConfirmations: 1,
        skipIfAlreadyDeployed: false,
        proxy: {
            proxyContract: 'OpenZeppelinTransparentProxy',
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
