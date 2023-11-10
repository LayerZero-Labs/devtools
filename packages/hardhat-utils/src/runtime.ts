import type { Network, HardhatRuntimeEnvironment, EthereumProvider, EIP1193Provider } from "hardhat/types"
import { DeploymentsManager } from "hardhat-deploy/dist/src/DeploymentsManager"
import { createProvider } from "hardhat/internal/core/providers/construction"

import assert from "assert"
import pMemoize from "p-memoize"
import { Signer } from "@ethersproject/abstract-signer"
import { Provider, JsonRpcProvider, Web3Provider } from "@ethersproject/providers"
import { Contract, ContractFactory } from "ethers"
import { DeploymentsExtension } from "hardhat-deploy/types"

/**
 * Helper type for when we need to grab something asynchronously by the network name
 */
export type GetByNetwork<TValue> = (networkName: string) => Promise<TValue>

export type GetContract = (contractName: string, signerOrProvider?: Signer | Provider) => Promise<Contract>

export type GetContractFactory = (contractName: string, signer?: Signer) => Promise<ContractFactory>

export type MinimalNetwork = Pick<Network, "name" | "config" | "provider">

/**
 * Factory function creator for providers that are not on the network
 * that hardhat has been configured with.
 *
 * This function returns the EIP1193 provider (that hardhat uses internally) that
 * needs to be wrapped for use with ethers (see `wrapEIP1193Provider`)
 *
 * ```typescript
 * const getProvider = createGetEthereumProvider(hre);
 * const provider = await getProvider("bsc-testnet");
 * const ethersProvider = wrapEIP1193Provider(provider);
 * ```
 *
 * @param hre `HardhatRuntimeEnvironment`
 * @returns `GetByNetwork<EthereumProvider>`
 */
export const createGetEthereumProvider = (hre: HardhatRuntimeEnvironment): GetByNetwork<EthereumProvider> =>
    pMemoize((networkName) => {
        const networkConfig = hre.config.networks[networkName]
        assert(networkConfig, `Missing network config for '${networkName}'`)

        return createProvider(hre.config, networkName, hre.artifacts)
    })

/**
 * Helper function that wraps an EIP1193Provider with Web3Provider
 * so that we can use it further with ethers
 *
 * @param provider `EIP1193Provider`
 * @returns `Web3Provider`
 */
export const wrapEIP1193Provider = (provider: EIP1193Provider): Web3Provider => new Web3Provider(provider)

/**
 * Factory function for trimmed-down `MinimalNetwork` objects that are not one the network
 * that hardhat has been configured with.
 *
 * ```typescript
 * const getNetwork = createGetNetwork(hre);
 * const network = await getNetwork("bsc-testnet");
 * ```
 *
 * @param hre `HardhatRuntimeEnvironment`
 * @returns `GetByNetwork<MinimalNetwork>`
 */
export const createGetNetwork = (hre: HardhatRuntimeEnvironment, getProvider = createGetEthereumProvider(hre)): GetByNetwork<MinimalNetwork> =>
    pMemoize(async (networkName) => {
        const networkConfig = hre.config.networks[networkName]
        const networkProvider = await getProvider(networkName)

        return {
            name: networkName,
            config: networkConfig,
            provider: networkProvider,
        }
    })

/**
 * Factory function for `DeploymentsExtension` objects that are not one the network
 * that hardhat has been configured with.
 *
 * ```typescript
 * const getDeployments = createGetDeployments(hre);
 * const deployments = await getDeployments("bsc-testnet");
 * const factoryDeploymentOnBscTestnet = await deployments.get("Factory");
 * ```
 *
 * @param hre `HardhatRuntimeEnvironment`
 * @returns `GetByNetwork<DeploymentsExtension>`
 */
export const createGetDeployments = (hre: HardhatRuntimeEnvironment, getNetwork = createGetNetwork(hre)): GetByNetwork<DeploymentsExtension> =>
    pMemoize(async (networkName) => {
        const network = await getNetwork(networkName)

        return new DeploymentsManager(hre, network as Network).deploymentsExtension
    })

/**
 * Factory function for `Contract` instances that are not one the network
 * that hardhat has been configured with.
 *
 *
 * ```typescript
 * const getContract = createGetContract(hre);
 * const getContractOnBscTestnet = await getContract("bsc-testnet")
 *
 * const router = await getContractOnBscTestnet("Router");
 *
 * // To get a connected instance, a provider or a signer needs to be passed in
 * const routerWithProvider = getContractOnBscTestnet("Router", provider)
 * const routerWithSigner = getContractOnBscTestnet("Router", signer)
 * ```
 *
 * @param hre `HardhatRuntimeEnvironment`
 * @returns `GetByNetwork<GetContract>`
 */
export const createGetContract = (hre: HardhatRuntimeEnvironment, getDeployments = createGetDeployments(hre)): GetByNetwork<GetContract> =>
    pMemoize(async (networkName) => {
        const deployments = await getDeployments(networkName)

        return async (contractName, signerOrProvider) => {
            const { address, abi } = await deployments.get(contractName)

            return new Contract(address, abi, signerOrProvider)
        }
    })

/**
 * Factory function for `ContractFactory` instances that are not one the network
 * that hardhat has been configured with.
 *
 *
 * ```typescript
 * const getContractFactory = createGetContractFactory(hre);
 * const getContractFactoryOnBscTestnet = await getContractFactory("bsc-testnet")
 *
 * const router = await getContractFactoryOnBscTestnet("Router");
 *
 * // To get a connected instance, a signer needs to be passed in
 * const routerWithSigner = getContractOnBscTestnet("Router", signer)
 * ```
 *
 * @param hre `HardhatRuntimeEnvironment`
 * @returns `GetByNetwork<GetContractFactory>`
 */
export const createGetContractFactory = (
    hre: HardhatRuntimeEnvironment,
    getDeployments = createGetDeployments(hre)
): GetByNetwork<GetContractFactory> =>
    pMemoize(async (networkName) => {
        const deployments = await getDeployments(networkName)

        return async (contractName, signer) => {
            const { abi, bytecode } = await deployments.getArtifact(contractName)

            return new ContractFactory(abi, bytecode, signer)
        }
    })

export interface NetworkEnvironment {
    network: MinimalNetwork
    provider: JsonRpcProvider
    deployments: DeploymentsExtension
    getContract: GetContract
    getContractFactory: GetContractFactory
}

/**
 * Creates a whole per-network environment for a particular network:
 *
 * ```typescript
 * const getEnvironment = createGetNetworkEnvironment(hre);
 * const environment = await getEnvironment("bsc-testnet")
 *
 * const provider = environment.provider
 * const signer = provider.getSigner()
 * const router = environment.getContract("Router")
 * const routerWithProvider = environment.getContract("Router", provider)
 * const routerWithSigner = environment.getContract("Router", signer)
 * const factoryDeployment = await environment.deployments.get("Factory")
 * ```
 *
 * @param hre `HardhatRuntimeEnvironment`
 * @param getProvider `GetByNetwork<EthereumProvider>`
 * @param getNetwork `GetByNetwork<MinimalNetwork>`
 * @param getDeployments `GetByNetwork<DeploymentsExtension>`
 * @param getContract `GetByNetwork<GetContract>`
 *
 * @returns `GetByNetwork<NetworkEnvironment>`
 */
export const createGetNetworkEnvironment = (
    hre: HardhatRuntimeEnvironment,
    getProvider = createGetEthereumProvider(hre),
    getNetwork = createGetNetwork(hre, getProvider),
    getDeployments = createGetDeployments(hre, getNetwork),
    getContract = createGetContract(hre, getDeployments),
    getContractFactory = createGetContractFactory(hre, getDeployments)
): GetByNetwork<NetworkEnvironment> =>
    pMemoize(async (networkName) => {
        const provider = await getProvider(networkName).then(wrapEIP1193Provider)
        const network = await getNetwork(networkName)
        const deployments = await getDeployments(networkName)

        return {
            network,
            provider,
            deployments,
            getContract: await getContract(networkName),
            getContractFactory: await getContractFactory(networkName),
        }
    })
