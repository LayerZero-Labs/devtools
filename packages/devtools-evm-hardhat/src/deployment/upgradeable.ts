import { DeployResult } from 'hardhat-deploy/dist/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

/**
 * Deploys a ProxyAdmin contract for managing upgradeable proxies
 *
 * Supports both shared and unique ProxyAdmin patterns:
 * - Default: pass contractName only (e.g. 'MyOFT' becomes 'MyOFTProxyAdmin')
 * - Shared: pass contractName='MyOFT', deploymentName='Shared' (becomes 'SharedProxyAdmin')
 * - Custom: pass contractName='MyOFT', deploymentName='CustomName' (becomes 'CustomNameProxyAdmin')
 *
 * @param options - Deployment options
 * @param options.hre - Hardhat Runtime Environment
 * @param options.contractName - Name of the contract being deployed
 * @param options.deploymentName - Base deployment name for the ProxyAdmin (defaults to contractName)
 * @param options.deployer - Address that will deploy the ProxyAdmin
 * @param options.owner - Address that will own the ProxyAdmin (defaults to deployer)
 * @returns Object containing the deployed ProxyAdmin address
 */
export async function deployProxyAdmin({
    hre,
    deployer,
    deploymentName = 'Default',
    owner = deployer,
    skipIfAlreadyDeployed = true,
}: {
    hre: HardhatRuntimeEnvironment
    deploymentName?: string
    deployer: string
    owner?: string
    skipIfAlreadyDeployed?: boolean
}): Promise<DeployResult> {
    const { deploy } = hre.deployments

    // Use require for JSON to avoid ES module import assertion issues
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const proxyAdminContract = require('hardhat-deploy/extendedArtifacts/ProxyAdmin.json')

    const fileName = deploymentName + 'ProxyAdmin'
    await checkDeploymentExists(hre, fileName)

    return await deploy(fileName, {
        from: deployer,
        contract: proxyAdminContract,
        args: [owner],
        log: true,
        waitConfirmations: 1,
        skipIfAlreadyDeployed,
    })
}

/**
 * Deploys an implementation contract
 *
 * Follows hardhat-deploy naming convention: name + '_Implementation'
 *
 * @param options - Deployment options
 * @param options.hre - Hardhat Runtime Environment
 * @param options.deploymentName - Deployment name (e.g. 'MyOFT' creates 'MyOFT_Implementation')
 * @param options.contractName - Name of the contract artifact to deploy
 * @param options.deployer - Address that will deploy the contract
 * @param options.args - Constructor arguments for the implementation contract
 * @returns Object containing the deployed implementation address
 */
export async function deployImplementation({
    hre,
    deployer,
    contractName,
    args,
    deploymentName = contractName,
    skipIfAlreadyDeployed = true,
}: {
    hre: HardhatRuntimeEnvironment
    contractName: string
    deployer: string
    args: unknown[]
    deploymentName?: string
    skipIfAlreadyDeployed?: boolean
}): Promise<DeployResult> {
    const { deploy } = hre.deployments
    const fileName = deploymentName + '_Implementation'

    await checkDeploymentExists(hre, fileName)

    return await deploy(fileName, {
        from: deployer,
        contract: contractName,
        args,
        log: true,
        waitConfirmations: 1,
        skipIfAlreadyDeployed,
    })
}

/**
 * Deploys a Transparent Upgradeable Proxy
 *
 * Follows hardhat-deploy naming convention: name + '_Proxy'
 * Supports both shared and unique ProxyAdmin patterns:
 * - Auto-resolve: deploymentName='MyOFT' will look for 'MyOFTProxyAdmin' automatically
 * - Shared: deploymentName='MyOFT', proxyAdminDeploymentName='SharedProxyAdmin'
 *
 * @param options - Deployment options
 * @param options.hre - Hardhat Runtime Environment
 * @param options.deploymentName - Deployment name (e.g. 'MyOFT' creates 'MyOFT_Proxy')
 * @param options.deployer - Address that will deploy the proxy
 * @param options.implementationAddress - Address of the implementation contract
 * @param options.proxyAdminAddress - Address of the ProxyAdmin contract (if known)
 * @param options.proxyAdminDeploymentName - Name of ProxyAdmin deployment to lookup (defaults to deploymentName + 'ProxyAdmin')
 * @param options.initializeData - Encoded initialization data to call on the implementation
 * @returns Object containing the deployed proxy address
 */
export async function deployProxy({
    hre,
    contractName,
    deploymentName = contractName,
    deployer,
    implementationAddress,
    proxyAdminAddress,
    proxyAdminDeploymentName,
    initializeData,
    skipIfAlreadyDeployed = true,
}: {
    hre: HardhatRuntimeEnvironment
    contractName: string
    deploymentName?: string
    deployer: string
    implementationAddress: string
    proxyAdminAddress?: string
    proxyAdminDeploymentName?: string
    initializeData: string
    skipIfAlreadyDeployed?: boolean
}): Promise<DeployResult> {
    const { deploy } = hre.deployments

    // Resolve ProxyAdmin address
    let resolvedProxyAdminAddress: string
    if (proxyAdminAddress) {
        resolvedProxyAdminAddress = proxyAdminAddress
    } else {
        // Auto-resolve ProxyAdmin deployment name by appending 'ProxyAdmin' to deploymentName
        const autoProxyAdminName = (proxyAdminDeploymentName || 'Default') + 'ProxyAdmin'
        const proxyAdminDeployment = await hre.deployments.get(autoProxyAdminName)
        resolvedProxyAdminAddress = proxyAdminDeployment.address
    }

    // Use require for JSON to avoid ES module import assertion issues
    // Using TransparentUpgradeableProxy to match hardhat-deploy's default behavior
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const proxyContract = require('hardhat-deploy/extendedArtifacts/TransparentUpgradeableProxy.json')
    const proxyName = deploymentName + '_Proxy'
    await checkDeploymentExists(hre, proxyName)
    return await deploy(proxyName, {
        from: deployer,
        contract: proxyContract,
        args: [implementationAddress, resolvedProxyAdminAddress, initializeData],
        log: true,
        waitConfirmations: 1,
        skipIfAlreadyDeployed,
    })
}

/**
 * Saves the combined deployment (proxy address with implementation ABI)
 * for use by LayerZero tooling
 *
 * Follows hardhat-deploy naming: looks up 'deploymentName_Proxy' and 'deploymentName_Implementation'
 * and saves as 'deploymentName' for easy reference
 *
 * @param options - Deployment options
 * @param options.hre - Hardhat Runtime Environment
 * @param options.deploymentName - Name of the deployment to save (matches the deploymentName used in other functions)
 */
export async function saveCombinedDeployment({
    hre,
    deploymentName,
}: {
    hre: HardhatRuntimeEnvironment
    deploymentName: string
}): Promise<void> {
    const existing = await hre.deployments.getOrNull(deploymentName)
    if (!existing) {
        const proxyName = deploymentName + '_Proxy'
        const implementationName = deploymentName + '_Implementation'

        const proxyDeployment = await hre.deployments.get(proxyName)
        const implementationDeployment = await hre.deployments.get(implementationName)

        // Merge ABIs like hardhat-deploy does: proxy ABI + implementation ABI
        // This gives us both proxy admin functions (upgradeTo, changeAdmin) AND implementation functions
        const mergedABI = mergeABIs(proxyDeployment.abi, implementationDeployment.abi)

        const deployment = {
            ...proxyDeployment,
            abi: mergedABI,
            implementation: implementationDeployment.address,
        }

        await hre.deployments.save(deploymentName, deployment)
    }
}

/**
 * Simple ABI merger that combines proxy and implementation ABIs
 * Mirrors hardhat-deploy's mergeABIs behavior for proxy deployments
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mergeABIs(proxyABI: any[], implementationABI: any[]): any[] {
    const result = [...proxyABI]

    // Add implementation functions that don't conflict with proxy functions
    for (const fragment of implementationABI) {
        if (fragment.type === 'constructor') {
            continue // Skip constructors from implementation
        }

        // Check if this function signature already exists in proxy ABI
        const existingFragment = result.find((existing) => {
            if (existing.type !== fragment.type) {
                return false
            }
            if (fragment.type === 'function' && existing.type === 'function') {
                // Compare function signatures (name + input types)
                return (
                    existing.name === fragment.name &&
                    JSON.stringify(existing.inputs) === JSON.stringify(fragment.inputs)
                )
            }
            return existing.name === fragment.name
        })

        if (!existingFragment) {
            result.push(fragment)
        }
        // If conflict exists, proxy ABI takes precedence (like hardhat-deploy with checkABIConflict=false)
    }

    return result
}

async function checkDeploymentExists(hre: HardhatRuntimeEnvironment, deploymentName: string): Promise<boolean> {
    const deployment = await hre.deployments.getOrNull(deploymentName)
    if (deployment != undefined || deployment != null) {
        console.log('Deployment exists for', deploymentName, deployment.address)
    }
    return deployment !== null
}
