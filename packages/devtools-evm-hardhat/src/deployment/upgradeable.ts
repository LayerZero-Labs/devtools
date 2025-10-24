import { DeployResult } from 'hardhat-deploy/dist/types'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

/**
 * Deploys a ProxyAdmin contract for managing upgradeable proxies
 *
 * @param options - Deployment options
 * @param options.hre - Hardhat Runtime Environment
 * @param options.contractName - Name of the contract being deployed (used for naming the ProxyAdmin)
 * @param options.deployer - Address that will deploy the ProxyAdmin
 * @param options.owner - Address that will own the ProxyAdmin (defaults to deployer)
 * @returns Object containing the deployed ProxyAdmin address
 */
export async function deployProxyAdmin({
    hre,
    contractName,
    deployer,
    owner = deployer,
    skipIfAlreadyDeployed = true,
}: {
    hre: HardhatRuntimeEnvironment
    contractName: string
    deployer: string
    owner?: string
    skipIfAlreadyDeployed?: boolean
}): Promise<DeployResult> {
    const { deploy } = hre.deployments

    // Use require for JSON to avoid ES module import assertion issues
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const proxyAdminContract = require('hardhat-deploy/extendedArtifacts/ProxyAdmin.json')
    const proxyAdminName = `${contractName}_ProxyAdmin`

    return await deploy(proxyAdminName, {
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
 * @param options - Deployment options
 * @param options.hre - Hardhat Runtime Environment
 * @param options.contractName - Name of the contract to deploy
 * @param options.deployer - Address that will deploy the contract
 * @param options.args - Constructor arguments for the implementation contract
 * @returns Object containing the deployed implementation address
 */
export async function deployImplementation({
    hre,
    contractName,
    deployer,
    args,
    skipIfAlreadyDeployed = true,
}: {
    hre: HardhatRuntimeEnvironment
    contractName: string
    deployer: string
    args: unknown[]
    skipIfAlreadyDeployed?: boolean
}): Promise<DeployResult> {
    const { deploy } = hre.deployments

    const implementationName = `${contractName}_Implementation`

    return await deploy(implementationName, {
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
 * @param options - Deployment options
 * @param options.hre - Hardhat Runtime Environment
 * @param options.contractName - Name of the contract (used for naming the proxy)
 * @param options.deployer - Address that will deploy the proxy
 * @param options.implementationAddress - Address of the implementation contract
 * @param options.proxyAdminAddress - Address of the ProxyAdmin contract
 * @param options.initializeData - Encoded initialization data to call on the implementation
 * @returns Object containing the deployed proxy address
 */
export async function deployProxy({
    hre,
    contractName,
    deployer,
    implementationAddress,
    proxyAdminAddress,
    initializeData,
    skipIfAlreadyDeployed = true,
}: {
    hre: HardhatRuntimeEnvironment
    contractName: string
    deployer: string
    implementationAddress: string
    proxyAdminAddress: string
    initializeData: string
    skipIfAlreadyDeployed?: boolean
}): Promise<DeployResult> {
    const { deploy } = hre.deployments

    // Use require for JSON to avoid ES module import assertion issues
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const proxyContract = require('hardhat-deploy/extendedArtifacts/OptimizedTransparentUpgradeableProxy.json')
    const proxyName = `${contractName}_Proxy`

    return await deploy(proxyName, {
        from: deployer,
        contract: proxyContract,
        args: [implementationAddress, proxyAdminAddress, initializeData],
        log: true,
        waitConfirmations: 1,
        skipIfAlreadyDeployed,
    })
}

/**
 * Saves the combined deployment (proxy address with implementation ABI)
 * for use by LayerZero tooling
 *
 * @param options - Deployment options
 * @param options.hre - Hardhat Runtime Environment
 * @param options.contractName - Name of the contract
 */
export async function saveCombinedDeployment({
    hre,
    contractName,
}: {
    hre: HardhatRuntimeEnvironment
    contractName: string
}): Promise<void> {
    const existing = await hre.deployments.getOrNull(contractName)
    if (!existing) {
        const proxyName = `${contractName}_Proxy`
        const implementationName = `${contractName}_Implementation`

        const proxyDeployment = await hre.deployments.get(proxyName)
        const implementationDeployment = await hre.deployments.get(implementationName)

        const deployment = {
            ...proxyDeployment,
            abi: implementationDeployment.abi,
        }

        await hre.deployments.save(contractName, deployment)
    }
}
