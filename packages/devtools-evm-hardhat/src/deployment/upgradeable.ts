import { HardhatRuntimeEnvironment } from 'hardhat/types'

/**
 * Deploys a ProxyAdmin contract for managing upgradeable proxies
 *
 * @param hre - Hardhat Runtime Environment
 * @param contractName - Name of the contract being deployed (used for naming the ProxyAdmin)
 * @param deployer - Address that will deploy the ProxyAdmin
 * @param owner - Address that will own the ProxyAdmin (defaults to deployer)
 * @returns Object containing the deployed ProxyAdmin address
 */
export async function deployProxyAdmin(
    hre: HardhatRuntimeEnvironment,
    contractName: string,
    deployer: string,
    owner: string = deployer
): Promise<{ address: string }> {
    const { deploy } = hre.deployments

    // Use require for JSON to avoid ES module import assertion issues
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const proxyAdminContract = require('hardhat-deploy/extendedArtifacts/ProxyAdmin.json')
    const proxyAdminName = `${contractName}_ProxyAdmin`

    const result = await deploy(proxyAdminName, {
        from: deployer,
        contract: proxyAdminContract,
        args: [owner],
        log: true,
        waitConfirmations: 1,
        skipIfAlreadyDeployed: true,
    })

    return { address: result.address }
}

/**
 * Deploys an implementation contract
 *
 * @param hre - Hardhat Runtime Environment
 * @param contractName - Name of the contract to deploy
 * @param deployer - Address that will deploy the contract
 * @param args - Constructor arguments for the implementation contract
 * @returns Object containing the deployed implementation address
 */
export async function deployImplementation(
    hre: HardhatRuntimeEnvironment,
    contractName: string,
    deployer: string,
    args: unknown[]
): Promise<{ address: string }> {
    const { deploy } = hre.deployments

    const implementationName = `${contractName}_Implementation`

    const result = await deploy(implementationName, {
        from: deployer,
        contract: contractName,
        args,
        log: true,
        waitConfirmations: 1,
        skipIfAlreadyDeployed: true,
    })

    return { address: result.address }
}

/**
 * Deploys a Transparent Upgradeable Proxy
 *
 * @param hre - Hardhat Runtime Environment
 * @param contractName - Name of the contract (used for naming the proxy)
 * @param deployer - Address that will deploy the proxy
 * @param implementationAddress - Address of the implementation contract
 * @param proxyAdminAddress - Address of the ProxyAdmin contract
 * @param initializeData - Encoded initialization data to call on the implementation
 * @returns Object containing the deployed proxy address
 */
export async function deployProxy(
    hre: HardhatRuntimeEnvironment,
    contractName: string,
    deployer: string,
    implementationAddress: string,
    proxyAdminAddress: string,
    initializeData: string
): Promise<{ address: string }> {
    const { deploy } = hre.deployments

    // Use require for JSON to avoid ES module import assertion issues
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const proxyContract = require('hardhat-deploy/extendedArtifacts/OptimizedTransparentUpgradeableProxy.json')
    const proxyName = `${contractName}_Proxy`

    const result = await deploy(proxyName, {
        from: deployer,
        contract: proxyContract,
        args: [implementationAddress, proxyAdminAddress, initializeData],
        log: true,
        waitConfirmations: 1,
        skipIfAlreadyDeployed: true,
    })

    return { address: result.address }
}

/**
 * Saves the combined deployment (proxy address with implementation ABI)
 * for use by LayerZero tooling
 *
 * @param hre - Hardhat Runtime Environment
 * @param contractName - Name of the contract
 */
export async function saveCombinedDeployment(hre: HardhatRuntimeEnvironment, contractName: string): Promise<void> {
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
