import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployResult } from 'hardhat-deploy/types'

// Enhanced deployment helper with better logging
export async function deployContract(
    hre: HardhatRuntimeEnvironment,
    contractName: string,
    deployer: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    args: any[],
    options: {
        skipIfAlreadyDeployed?: boolean
        gasLimit?: number
        log?: boolean
    } = {}
): Promise<DeployResult> {
    const { skipIfAlreadyDeployed = true, gasLimit, log = true } = options

    console.log(`Deploying ${contractName}...`)
    console.log(`   Args: ${JSON.stringify(args, null, 2)}`)

    const deployment = await hre.deployments.deploy(contractName, {
        from: deployer,
        args,
        log,
        skipIfAlreadyDeployed,
        ...(gasLimit && { gasLimit }),
    })

    if (deployment.newlyDeployed) {
        console.log(`${contractName} deployed to: ${deployment.address}`)
        console.log(`   Gas used: ${deployment.receipt?.gasUsed || 'N/A'}`)
        console.log(`   Tx hash: ${deployment.transactionHash}`)
    } else {
        console.log(`${contractName} already deployed at: ${deployment.address}`)
    }

    return deployment
}

// Network validation
export function validateNetwork(hre: HardhatRuntimeEnvironment): { networkEid: number; deployer: string } {
    const networkEid = hre.network.config?.eid
    if (!networkEid) {
        throw new Error(`Network ${hre.network.name} is missing 'eid' in config`)
    }
    return { networkEid, deployer: '' } // You'd get deployer from getNamedAccounts()
}
