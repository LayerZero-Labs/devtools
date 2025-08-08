import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployResult } from 'hardhat-deploy/types'

import { OFTConfigAsset, OFTConfigShare } from './types'

function shouldDeployOnNetwork(oftConfig: OFTConfigAsset | OFTConfigShare, networkEid: number): boolean {
    return getConfigType(oftConfig) === 'TokenMetadata' && oftConfig.networks.includes(networkEid)
}

function getConfigType(token: OFTConfigAsset | OFTConfigShare): 'TokenMetadata' | 'OFTAddress' {
    if (typeof token.oft === 'string') {
        return 'OFTAddress'
    } else {
        return 'TokenMetadata'
    }
}

async function deployContract(
    hre: HardhatRuntimeEnvironment,
    contractName: string,
    deployer: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args: any[],
    skipIfAlreadyDeployed = true
): Promise<DeployResult> {
    const deployment = await hre.deployments.deploy(contractName, {
        from: deployer,
        args,
        log: true,
        skipIfAlreadyDeployed,
    })

    console.log(`Deployed contract: ${contractName}, network: ${hre.network.name}, address: ${deployment.address}`)

    return deployment
}

export { shouldDeployOnNetwork, getConfigType, deployContract }
