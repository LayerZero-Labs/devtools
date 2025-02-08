import { ethers } from 'hardhat'
import { type DeployFunction } from 'hardhat-deploy/types'

import { IMetadata } from '@layerzerolabs/metadata-tools'

const contractName = 'MyEndpointV1OFTV2Mock'
const METADATA_DEPLOYMENTS_URL = 'https://metadata.layerzero-api.com/v1/metadata/deployments'

const deploy: DeployFunction = async ({ getNamedAccounts, deployments, network }) => {
    console.log('Deploy script started...')
    const { deploy } = deployments
    const { deployer } = await getNamedAccounts()
    console.log(`>>> your address: ${deployer}`)

    const metadata = (await fetch(METADATA_DEPLOYMENTS_URL).then((res) => res.json())) as IMetadata
    const lzDeploymentsForNetwork = metadata[network.name]?.deployments
    const lzEndpointAddress = lzDeploymentsForNetwork?.find((d) => d.eid === String(network.config.eid))?.endpoint
        ?.address

    if (!lzEndpointAddress) {
        throw new Error(`No endpoint address found for network: ${network.name}`)
    }

    await deploy(contractName, {
        from: deployer,
        args: [lzEndpointAddress, ethers.utils.parseUnits('1000000', 18), 6],
        log: true,
        waitConfirmations: 1,
    })
}

deploy.tags = [contractName]
export default deploy
