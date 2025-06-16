import chalk from 'chalk'
import { Contract, Signer, ethers, utils } from 'ethers'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { OmniAddress, OmniPoint, OmniTransaction, flattenTransactions } from '@layerzerolabs/devtools'
import { createGetHreByEid } from '@layerzerolabs/devtools-evm-hardhat'
import { createModuleLogger } from '@layerzerolabs/io-devtools'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { addressToBytes32 } from '@layerzerolabs/lz-v2-utilities'
import { Uln302ExecutorConfig, Uln302UlnConfig } from '@layerzerolabs/protocol-devtools'
import { LzAppOmniGraph, OAppEdgeConfig } from '@layerzerolabs/ua-devtools'

export const COLORS = {
    default: chalk.white,
    error: chalk.red,
    warning: chalk.yellow,
    success: chalk.green,
    palette: [
        chalk.magenta,
        chalk.cyan,
        chalk.yellow,
        chalk.blue,
        chalk.magentaBright,
        chalk.cyanBright,
        chalk.blueBright,
    ],
}

export const SUCCESS_SYMBOL = COLORS.success`✓`
// Define constants for config types
const CONFIG_TYPE_EXECUTOR = 1
const CONFIG_TYPE_ULN = 2

// Define the zero address using ethers.js constant
export const zeroAddress = ethers.constants.AddressZero

/**
 * Get the executor config for EPV1 (EVM-based) OApp
 * @param hre {HardhatRuntimeEnvironment} Hardhat runtime environment
 * @param eid {EndpointId} Remote Endpoint ID
 * @param address {OmniAddress} Address of the OApp
 * @returns Uln302ExecutorConfig or undefined
 */
export async function getEpv1ExecutorConfig(
    hre: HardhatRuntimeEnvironment,
    eid: EndpointId,
    address: OmniAddress
): Promise<Uln302ExecutorConfig | undefined> {
    try {
        const sendUlnDeployment = await hre.deployments.get('SendUln301')
        const signer: Signer = hre.ethers.provider.getSigner()

        const sendUlnContract = new Contract(sendUlnDeployment.address, sendUlnDeployment.abi, signer)
        const configBytes: string = await sendUlnContract.getConfig(eid, address, CONFIG_TYPE_EXECUTOR)

        const [executorConfigRaw] = ethers.utils.defaultAbiCoder.decode(
            ['tuple(uint32 maxMessageSize, address executorAddress)'],
            configBytes
        )

        const executorConfig: Uln302ExecutorConfig = {
            executor: executorConfigRaw.executorAddress,
            maxMessageSize: executorConfigRaw.maxMessageSize,
        }

        return executorConfig
    } catch (error) {
        const moduleLogger = createModuleLogger('LzApp')
        moduleLogger.error(`Error fetching EPV1 executor config: ${(error as Error).message}`)
        return undefined
    }
}

/**
 * Get the ULN config for EPV1 (EVM-based) OApp
 * @param hre {HardhatRuntimeEnvironment} Hardhat runtime environment
 * @param eid {EndpointId} Remote Endpoint ID
 * @param address {OmniAddress} Address of the OApp
 * @returns Uln302UlnConfig or undefined
 */
export async function getEpv1SendUlnConfig(
    hre: HardhatRuntimeEnvironment,
    eid: EndpointId,
    address: OmniAddress
): Promise<Uln302UlnConfig | undefined> {
    try {
        const sendUlnDeployment = await hre.deployments.get('SendUln301')
        const signer: Signer = hre.ethers.provider.getSigner()

        const sendUlnContract = new Contract(sendUlnDeployment.address, sendUlnDeployment.abi, signer)
        const configBytes: string = await sendUlnContract.getConfig(eid, address, CONFIG_TYPE_ULN)

        const [ulnConfigRaw] = ethers.utils.defaultAbiCoder.decode(
            [
                'tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)',
            ],
            configBytes
        )

        const ulnConfig: Uln302UlnConfig = {
            confirmations: ulnConfigRaw.confirmations.toNumber(),
            requiredDVNs: ulnConfigRaw.requiredDVNs,
            optionalDVNs: ulnConfigRaw.optionalDVNs,
            optionalDVNThreshold: ulnConfigRaw.optionalDVNThreshold,
        }

        return ulnConfig
    } catch (error) {
        const moduleLogger = createModuleLogger('LzApp')
        moduleLogger.error(`Error fetching EPV1 ULN config: ${(error as Error).message}`)
        return undefined
    }
}

/**
 * Get the ULN config for EPV1 (EVM-based) OApp
 * @param hre {HardhatRuntimeEnvironment} Hardhat runtime environment
 * @param eid {EndpointId} Remote Endpoint ID
 * @param address {OmniAddress} Address of the OApp
 * @returns Uln302UlnConfig or undefined
 */
export async function getEpv1ReceiveUlnConfig(
    hre: HardhatRuntimeEnvironment,
    eid: EndpointId,
    address: OmniAddress
): Promise<Uln302UlnConfig | undefined> {
    try {
        const sendUlnDeployment = await hre.deployments.get('ReceiveUln301')
        const signer: Signer = hre.ethers.provider.getSigner()

        const sendUlnContract = new Contract(sendUlnDeployment.address, sendUlnDeployment.abi, signer)
        const configBytes: string = await sendUlnContract.getConfig(eid, address, CONFIG_TYPE_ULN)

        const [ulnConfigRaw] = ethers.utils.defaultAbiCoder.decode(
            [
                'tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)',
            ],
            configBytes
        )

        const ulnConfig: Uln302UlnConfig = {
            confirmations: ulnConfigRaw.confirmations.toNumber(),
            requiredDVNs: ulnConfigRaw.requiredDVNs,
            optionalDVNs: ulnConfigRaw.optionalDVNs,
            optionalDVNThreshold: ulnConfigRaw.optionalDVNThreshold,
        }

        return ulnConfig
    } catch (error) {
        const moduleLogger = createModuleLogger('LzApp')
        moduleLogger.error(`Error fetching EPV1 ULN config: ${(error as Error).message}`)
        return undefined
    }
}

/**
 * Get the send library address for EPV1 (EVM-based) OApp
 * @param hre {HardhatRuntimeEnvironment} Hardhat runtime environment
 * @param eid {EndpointId} Remote Endpoint ID
 * @param address {OmniAddress} Address of the OApp
 * @returns Send library address or undefined
 */
export async function getEpv1SendLibraryAddress(
    hre: HardhatRuntimeEnvironment,
    address: OmniAddress
): Promise<string | undefined> {
    try {
        const endpointDeployment = await hre.deployments.get('Endpoint')
        const signer: Signer = hre.ethers.provider.getSigner()

        const endpointContract = new Contract(endpointDeployment.address, endpointDeployment.abi, signer)
        const sendLibraryAddress: string = await endpointContract.getSendLibraryAddress(address)

        return sendLibraryAddress
    } catch (error) {
        const moduleLogger = createModuleLogger('LzApp')
        moduleLogger.error(`Error fetching EPV1 send library: ${(error as Error).message}`)
        return undefined
    }
}

/**
 * Get the receive library address for EPV1 (EVM-based) OApp
 * @param hre {HardhatRuntimeEnvironment} Hardhat runtime environment
 * @param eid {EndpointId} Remote Endpoint ID
 * @param address {OmniAddress} Address of the OApp
 * @returns Receive library address or undefined
 */
export async function getEpv1ReceiveLibraryAddress(
    hre: HardhatRuntimeEnvironment,
    eid: EndpointId,
    address: OmniAddress
): Promise<string | undefined> {
    try {
        const endpointDeployment = await hre.deployments.get('Endpoint')
        const signer: Signer = hre.ethers.provider.getSigner()

        const endpointContract = new Contract(endpointDeployment.address, endpointDeployment.abi, signer)
        const receiveLibraryAddress: string = await endpointContract.getReceiveLibraryAddress(address)

        return receiveLibraryAddress
    } catch (error) {
        const moduleLogger = createModuleLogger('LzApp')
        moduleLogger.error(`Error fetching EPV1 receive library: ${(error as Error).message}`)
        return undefined
    }
}

/**
 * Get the send library address for EPV1 (EVM-based) OApp
 * @param hre {HardhatRuntimeEnvironment} Hardhat runtime environment
 * @param eid {EndpointId} Remote Endpoint ID
 * @param address {OmniAddress} Address of the OApp
 * @returns Send library address or undefined
 */
export async function getEpv1DefaultSendLibraryAddress(hre: HardhatRuntimeEnvironment): Promise<string | undefined> {
    try {
        const endpointDeployment = await hre.deployments.get('Endpoint')
        const signer: Signer = hre.ethers.provider.getSigner()

        const endpointContract = new Contract(endpointDeployment.address, endpointDeployment.abi, signer)
        const DEFAULT_SEND_VERSION = await endpointContract.getSendVersion(zeroAddress)
        const sendLibraryAddress = await endpointContract.libraryLookup(DEFAULT_SEND_VERSION)

        return sendLibraryAddress
    } catch (error) {
        const moduleLogger = createModuleLogger('LzApp')
        moduleLogger.error(`Error fetching EPV1 send library address: ${(error as Error).message}`)
        return undefined
    }
}

/**
 * Get the default Receive Library address for EPV1 (EVM-based) OApp
 * @param hre {HardhatRuntimeEnvironment} - Hardhat runtime environment
 * @returns {Promise<string | undefined>}
 */
export async function getEpv1DefaultReceiveLibraryAddress(hre: HardhatRuntimeEnvironment): Promise<string | undefined> {
    try {
        const endpointDeployment = await hre.deployments.get('Endpoint')
        const signer: Signer = hre.ethers.provider.getSigner()

        const endpointContract = new Contract(endpointDeployment.address, endpointDeployment.abi, signer)
        // 1. get default versions
        const DEFAULT_RECEIVE_VERSION = await endpointContract.defaultReceiveVersion()
        // 2. lookup library
        const defaultReceiveLibraryAddress: string = await endpointContract.libraryLookup(DEFAULT_RECEIVE_VERSION)

        return defaultReceiveLibraryAddress
    } catch (error) {
        const moduleLogger = createModuleLogger('LzApp')
        moduleLogger.error(`Error fetching EPV1 receive library address: ${(error as Error).message}`)
        return undefined
    }
}

/**
 * Get the executor config for EPV1 (EVM-based) OApp
 * @param hre {HardhatRuntimeEnvironment} Hardhat runtime environment
 * @param eid {EndpointId} Remote Endpoint ID
 * @param address {OmniAddress} Address of the OApp
 * @returns Uln302ExecutorConfig or undefined
 */
export async function getEpv1DefaultExecutorConfig(
    hre: HardhatRuntimeEnvironment,
    eid: EndpointId
): Promise<Uln302ExecutorConfig | undefined> {
    try {
        const endpointDeployment = await hre.deployments.get('Endpoint')
        const signer: Signer = hre.ethers.provider.getSigner()

        const endpointContract = new Contract(endpointDeployment.address, endpointDeployment.abi, signer)
        const DEFAULT_SEND_VERSION = await endpointContract.defaultSendVersion()
        const configBytes: string = await endpointContract.getConfig(
            DEFAULT_SEND_VERSION,
            eid,
            zeroAddress,
            CONFIG_TYPE_EXECUTOR
        )

        const emptyExecutorConfig: Uln302ExecutorConfig = {
            executor: zeroAddress,
            maxMessageSize: 0,
        }

        if (configBytes === '0x0000000000000000000000000000000000000000000000000000000000000000') {
            return emptyExecutorConfig
        }
        const [executorConfigRaw] = ethers.utils.defaultAbiCoder.decode(
            ['tuple(uint32 maxMessageSize, address executorAddress)'],
            configBytes
        )

        const executorConfig: Uln302ExecutorConfig = {
            executor: executorConfigRaw.executorAddress,
            maxMessageSize: executorConfigRaw.maxMessageSize,
        }

        return executorConfig
    } catch (error) {
        const moduleLogger = createModuleLogger('LzApp')
        moduleLogger.error(`Error fetching EPV1 default Executor config: ${(error as Error).message}`)
        return undefined
    }
}

/**
 * Get the executor config for EPV1 (EVM-based) OApp
 * @param hre {HardhatRuntimeEnvironment} Hardhat runtime environment
 * @param eid {EndpointId} Remote Endpoint ID
 * @returns Uln302ExecutorConfig or undefined
 */
export async function getEpv1DefaultSendConfig(
    hre: HardhatRuntimeEnvironment,
    eid: EndpointId
): Promise<Uln302UlnConfig | undefined> {
    try {
        const endpointDeployment = await hre.deployments.get('Endpoint')
        const signer: Signer = hre.ethers.provider.getSigner()

        const endpointContract = new Contract(endpointDeployment.address, endpointDeployment.abi, signer)
        const DEFAULT_SEND_VERSION = await endpointContract.defaultSendVersion()
        const configBytes: string = await endpointContract.getConfig(
            DEFAULT_SEND_VERSION,
            eid,
            zeroAddress,
            CONFIG_TYPE_ULN
        )

        const emptyUlnConfig: Uln302UlnConfig = {
            confirmations: BigInt(0),
            requiredDVNs: [zeroAddress],
            optionalDVNs: [],
            optionalDVNThreshold: 0,
        }

        if (configBytes === '0x0000000000000000000000000000000000000000000000000000000000000000') {
            return emptyUlnConfig
        }

        const [ulnConfigRaw] = ethers.utils.defaultAbiCoder.decode(
            [
                'tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)',
            ],
            configBytes
        )

        const ulnConfig: Uln302UlnConfig = {
            confirmations: ulnConfigRaw.confirmations.toNumber(),
            requiredDVNs: ulnConfigRaw.requiredDVNs,
            optionalDVNs: ulnConfigRaw.optionalDVNs,
            optionalDVNThreshold: ulnConfigRaw.optionalDVNThreshold,
        }

        return ulnConfig
    } catch (error) {
        const moduleLogger = createModuleLogger('LzApp')
        moduleLogger.error(`Error fetching EPV1 default ULN config: ${(error as Error).message}`)
        return undefined
    }
}

/**
 * Get the executor config for EPV1 (EVM-based) OApp
 * @param hre {HardhatRuntimeEnvironment} Hardhat runtime environment
 * @param eid {EndpointId} Remote Endpoint ID
 * @returns Uln302ExecutorConfig or undefined
 */
export async function getEpv1DefaultReceiveConfig(
    hre: HardhatRuntimeEnvironment,
    eid: EndpointId
): Promise<Uln302UlnConfig | undefined> {
    try {
        const endpointDeployment = await hre.deployments.get('Endpoint')
        const signer: Signer = hre.ethers.provider.getSigner()

        const endpointContract = new Contract(endpointDeployment.address, endpointDeployment.abi, signer)
        const DEFAULT_RECEIVE_VERSION = await endpointContract.defaultReceiveVersion()
        const configBytes: string = await endpointContract.getConfig(
            DEFAULT_RECEIVE_VERSION,
            eid,
            zeroAddress,
            CONFIG_TYPE_ULN
        )

        const emptyUlnConfig: Uln302UlnConfig = {
            confirmations: BigInt(0),
            requiredDVNs: [zeroAddress],
            optionalDVNs: [],
            optionalDVNThreshold: 0,
        }

        if (configBytes === '0x0000000000000000000000000000000000000000000000000000000000000000') {
            return emptyUlnConfig
        }

        const [ulnConfigRaw] = ethers.utils.defaultAbiCoder.decode(
            [
                'tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)',
            ],
            configBytes
        )

        const ulnConfig: Uln302UlnConfig = {
            confirmations: ulnConfigRaw.confirmations.toNumber(),
            requiredDVNs: ulnConfigRaw.requiredDVNs,
            optionalDVNs: ulnConfigRaw.optionalDVNs,
            optionalDVNThreshold: ulnConfigRaw.optionalDVNThreshold,
        }

        return ulnConfig
    } catch (error) {
        const moduleLogger = createModuleLogger('LzApp')
        moduleLogger.error(`Error fetching EPV1 default ULN receive config: ${(error as Error).message}`)
        return undefined
    }
}

export interface LzAppConfig {
    sendLibrary: string
    receiveLibrary: string
    sendExecutorConfig: Uln302ExecutorConfig
    sendUlnConfig: Uln302UlnConfig
    receiveUlnConfig: Uln302UlnConfig
}

/**
 * Retrieves the index of a library address from the Endpoint's libraryLookup mapping.
 * @param hre {HardhatRuntimeEnvironment} Hardhat runtime environment
 * @param libraryAddress {string} Address of the library to find
 * @returns The index of the library or undefined if not found
 */
export async function getLibraryIndex(
    hre: HardhatRuntimeEnvironment,
    libraryAddress: string
): Promise<number | undefined> {
    try {
        const endpointDeployment = await hre.deployments.get('Endpoint')
        const signer: Signer = hre.ethers.provider.getSigner()

        const endpointContract = new Contract(endpointDeployment.address, endpointDeployment.abi, signer)

        const MAX_ITERATIONS = await endpointContract.latestVersion()

        for (let i = 0; i <= MAX_ITERATIONS; i++) {
            const currentLibraryAddress = await endpointContract.libraryLookup(i)
            if (currentLibraryAddress === libraryAddress) {
                return i
            }
        }

        console.error(`[LzApp] Library address ${libraryAddress} not found in libraryLookup mapping.`)
        return undefined
    } catch (error) {
        console.error(`[LzApp] Error searching for library index: ${(error as Error).message}`)
        return undefined
    }
}

/**
 * Encodes the ExecutorConfig into ABI-encoded bytes.
 * @param config Uln302ExecutorConfig object
 * @returns ABI-encoded string
 */
function encodeExecutorConfig(config: Uln302ExecutorConfig): string {
    return ethers.utils.defaultAbiCoder.encode(
        ['tuple(uint32 maxMessageSize, address executorAddress)'],
        [[config.maxMessageSize, config.executor]]
    )
}

/**
 * Encodes the UlnConfig into ABI-encoded bytes.
 * @param config Uln302UlnConfig object
 * @returns ABI-encoded string
 */
function encodeUlnConfig(config: Uln302UlnConfig): string {
    return ethers.utils.defaultAbiCoder.encode(
        [
            'tuple(uint64 confirmations, uint8 requiredDVNCount, uint8 optionalDVNCount, uint8 optionalDVNThreshold, address[] requiredDVNs, address[] optionalDVNs)',
        ],
        [
            [
                config.confirmations,
                config.requiredDVNs.length,
                config.optionalDVNs.length,
                config.optionalDVNThreshold,
                config.requiredDVNs || [],
                config.optionalDVNs || [],
            ],
        ]
    )
}

/**
 * Retrieves the current Send Library version index from the LzApp contract.
 */
export async function getSendLibrary(
    hre: HardhatRuntimeEnvironment,
    lzApp: OmniPoint
): Promise<[string | undefined, number | undefined]> {
    const lzAppDeployment = await hre.deployments.get(lzApp.contractName || lzApp.address)
    const lzAppContract = new Contract(lzAppDeployment.address, lzAppDeployment.abi, hre.ethers.provider)
    const endpointDeployment = await hre.deployments.get('Endpoint')
    const endpointContract = new Contract(endpointDeployment.address, endpointDeployment.abi)

    try {
        const sendLibraryIndex = await lzAppContract.sendVersion()
        const currentLibraryAddress = await endpointContract.libraryLookup(sendLibraryIndex)
        return [currentLibraryAddress, sendLibraryIndex]
    } catch (error) {
        console.error(`[LzApp] Failed to retrieve Send Library version:`, error)
        return [undefined, undefined]
    }
}

/**
 * Retrieves the current Receive Library version index from the LzApp contract.
 */
export async function getReceiveLibrary(
    hre: HardhatRuntimeEnvironment,
    lzApp: OmniPoint
): Promise<[string | undefined, number | undefined]> {
    const lzAppDeployment = await hre.deployments.get(lzApp.contractName || lzApp.address)
    const lzAppContract = new Contract(lzAppDeployment.address, lzAppDeployment.abi, hre.ethers.provider)
    const endpointDeployment = await hre.deployments.get('Endpoint')
    const endpointContract = new Contract(endpointDeployment.address, endpointDeployment.abi)

    try {
        const receiveLibraryIndex = await lzAppContract.receiveVersion()
        const currentLibraryAddress = await endpointContract.libraryLookup(receiveLibraryIndex)
        return [currentLibraryAddress, receiveLibraryIndex]
    } catch (error) {
        console.error(`[LzApp] Failed to retrieve Receive Library version:`, error)
        return [undefined, undefined]
    }
}

// function getConfig(
//     uint16 _version,
//     uint16 _chainId,
//     address,
//     uint _configType

/**
 * Retrieves the current Executor Config for a specific Endpoint ID from the LzApp contract.
 */
export async function getExecutorConfig(
    hre: HardhatRuntimeEnvironment,
    lzApp: OmniPoint,
    currentLibVersion: number,
    eid: EndpointId
): Promise<Uln302ExecutorConfig | undefined> {
    const lzAppDeployment = await hre.deployments.get(lzApp.contractName || lzApp.address)
    const lzAppContract = new Contract(lzAppDeployment.address, lzAppDeployment.abi, hre.ethers.provider)

    try {
        const executorConfig = await lzAppContract.getConfig(currentLibVersion, eid, CONFIG_TYPE_EXECUTOR)
        console.log(`[LzApp] Current Executor Config for Endpoint ID ${eid}:`, executorConfig)
        return executorConfig
    } catch (error) {
        console.error(`[LzApp] Failed to retrieve Executor Config for Endpoint ID ${eid}:`, error)
        return undefined
    }
}

/**
 * Retrieves the current ULN Config for a specific Endpoint ID from the LzApp contract.
 */
export async function getUlnConfig(
    hre: HardhatRuntimeEnvironment,
    lzApp: OmniPoint,
    sendLibVersion: number,
    receiveLibVersion: number,
    eid: EndpointId
): Promise<{ sendConfig: Uln302UlnConfig; receiveConfig: Uln302UlnConfig } | undefined> {
    const lzAppDeployment = await hre.deployments.get(lzApp.contractName || lzApp.address)
    const lzAppContract = new Contract(lzAppDeployment.address, lzAppDeployment.abi, hre.ethers.provider)

    try {
        const sendUlnConfig = await lzAppContract.getConfig(sendLibVersion, eid, CONFIG_TYPE_ULN)
        const receiveUlnConfig = await lzAppContract.getConfig(receiveLibVersion, eid, CONFIG_TYPE_ULN)
        console.log(`[LzApp] Current ULN Config for Endpoint ID ${eid}:`, {
            sendConfig: sendUlnConfig,
            receiveConfig: receiveUlnConfig,
        })
        return { sendConfig: sendUlnConfig, receiveConfig: receiveUlnConfig }
    } catch (error) {
        console.error(`[LzApp] Failed to retrieve ULN Config for Endpoint ID ${eid}:`, error)
        return undefined
    }
}

/**
 * Sets the Send Library address on the LzApp contract and returns the transaction.
 */
export async function setSendLibrary(
    hre: HardhatRuntimeEnvironment,
    lzApp: OmniPoint,
    sendLibraryAddress: string
): Promise<OmniTransaction | undefined> {
    if (!sendLibraryAddress || sendLibraryAddress === zeroAddress) {
        console.log(`[LzApp] Invalid Send Library address: ${sendLibraryAddress}. Skipping.`)
        return undefined
    }

    const sendLibraryIndex = await getLibraryIndex(hre, sendLibraryAddress)
    if (sendLibraryIndex === undefined) {
        console.error(`[LzApp] Send Library address not found: ${sendLibraryAddress}`)
        return undefined
    }

    const lzAppDeployment = await hre.deployments.get(lzApp.contractName || lzApp.address)
    const lzAppContract = new Contract(lzAppDeployment.address, lzAppDeployment.abi, hre.ethers.provider.getSigner())

    const data = lzAppContract.interface.encodeFunctionData('setSendVersion', [sendLibraryIndex])
    return {
        point: lzApp,
        data,
        description: `Set Send Library version to index ${sendLibraryIndex}`,
    }
}

/**
 * Sets the Receive Library address on the LzApp contract and returns the transaction.
 */
export async function setReceiveLibrary(
    hre: HardhatRuntimeEnvironment,
    lzApp: OmniPoint,
    receiveLibraryAddress: string
): Promise<OmniTransaction | undefined> {
    if (!receiveLibraryAddress || receiveLibraryAddress === zeroAddress) {
        console.log(`[LzApp] Invalid Receive Library address: ${receiveLibraryAddress}. Skipping.`)
        return undefined
    }

    const receiveLibraryIndex = await getLibraryIndex(hre, receiveLibraryAddress)
    if (receiveLibraryIndex === undefined) {
        console.error(`[LzApp] Receive Library address not found: ${receiveLibraryAddress}`)
        return undefined
    }

    const lzAppDeployment = await hre.deployments.get(lzApp.contractName || lzApp.address)
    const lzAppContract = new Contract(lzAppDeployment.address, lzAppDeployment.abi, hre.ethers.provider.getSigner())

    const data = lzAppContract.interface.encodeFunctionData('setReceiveVersion', [receiveLibraryIndex])
    return {
        point: lzApp,
        data,
        description: `Set Receive Library version to index ${receiveLibraryIndex}`,
    }
}

/**
 * Sets the Executor Config on the LzApp contract and returns the transaction.
 */
export async function setExecutorConfig(
    hre: HardhatRuntimeEnvironment,
    lzApp: OmniPoint,
    lzAppConfig: OAppEdgeConfig,
    eid: EndpointId
): Promise<OmniTransaction | undefined> {
    const lzAppDeployment = await hre.deployments.get(lzApp.contractName || lzApp.address)
    const lzAppContract = new Contract(lzAppDeployment.address, lzAppDeployment.abi, hre.ethers.provider.getSigner())
    const sendUlnIndex = await getLibraryIndex(hre, lzAppConfig.sendLibrary!)
    const encodedConfig = encodeExecutorConfig(lzAppConfig.sendConfig?.executorConfig as Uln302ExecutorConfig)
    const data = lzAppContract.interface.encodeFunctionData('setConfig', [
        sendUlnIndex,
        eid,
        CONFIG_TYPE_EXECUTOR,
        encodedConfig,
    ])
    return {
        point: lzApp,
        data,
        description: `Set Executor Config for Endpoint ID ${eid}`,
    }
}

/**
 * Sets the ULN Config on the LzApp contract and returns the transaction.
 */
export async function setUlnConfig(
    hre: HardhatRuntimeEnvironment,
    lzApp: OmniPoint,
    lzAppConfig: OAppEdgeConfig,
    eid: EndpointId
): Promise<OmniTransaction[]> {
    const lzAppDeployment = await hre.deployments.get(lzApp.contractName || lzApp.address)
    const lzAppContract = new Contract(lzAppDeployment.address, lzAppDeployment.abi, hre.ethers.provider.getSigner())

    const sendUlnIndex = await getLibraryIndex(hre, lzAppConfig.sendLibrary!)
    const receiveUlnIndex = await getLibraryIndex(hre, lzAppConfig.receiveLibraryConfig?.receiveLibrary!)

    const encodedSendUlnConfig = encodeUlnConfig(lzAppConfig.sendConfig?.ulnConfig as Uln302UlnConfig)
    const encodedReceiveUlnConfig = encodeUlnConfig(lzAppConfig.receiveConfig?.ulnConfig as Uln302UlnConfig)

    const sendTx = {
        point: lzApp,
        data: lzAppContract.interface.encodeFunctionData('setConfig', [
            sendUlnIndex,
            eid,
            CONFIG_TYPE_ULN,
            encodedSendUlnConfig,
        ]),
        description: `Set Send ULN Config for Endpoint ID ${eid}`,
    }

    const receiveTx = {
        point: lzApp,
        data: lzAppContract.interface.encodeFunctionData('setConfig', [
            receiveUlnIndex,
            eid,
            CONFIG_TYPE_ULN,
            encodedReceiveUlnConfig,
        ]),
        description: `Set Receive ULN Config for Endpoint ID ${eid}`,
    }

    return [sendTx, receiveTx]
}

/**
 * Configures the LzApp contract with executor, ULN configs, and library addresses.
 * @param hre {HardhatRuntimeEnvironment} - Hardhat runtime environment
 * @param lzApp {OmniPoint} - The LzApp identifier containing contract name or address.
 * @param config {LzAppConfig} - The LzApp configuration object.
 * @param to {eid: EndpointId; address: OmniAddress} - Remote endpoint information.
 * @param from {eid: EndpointId; address: OmniAddress} - Local endpoint information.
 * @returns {Promise<void>}
 */
export async function configureLzApp(
    hre: HardhatRuntimeEnvironment,
    lzApp: OmniPoint,
    config: LzAppConfig,
    to: { eid: EndpointId; address: OmniAddress }
): Promise<void> {
    await Promise.all([
        setSendLibrary(hre, lzApp, config.sendLibrary),
        setReceiveLibrary(hre, lzApp, config.receiveLibrary),
        setExecutorConfig(hre, lzApp, config, to.eid),
        setUlnConfig(hre, lzApp, config, to.eid),
    ])
}

/**
 * Sets the trusted remote address for the LzApp contract.
 * @param hre {HardhatRuntimeEnvironment} - Hardhat runtime environment.
 * @param lzApp {OmniPoint} - The LzApp identifier containing contract name or address.
 * @param to {eid: EndpointId; address: OmniAddress} - Remote endpoint information.
 * @param from {eid: EndpointId; address: OmniAddress} - Local endpoint information.
 * @returns {Promise<void>}
 */
export async function setTrustedRemote(
    hre: HardhatRuntimeEnvironment,
    lzApp: OmniPoint,
    to: { eid: EndpointId; address: OmniAddress }
): Promise<OmniTransaction | undefined> {
    try {
        // Define the LzApp contract
        const lzAppDeployment = await hre.deployments.get(lzApp.contractName || lzApp.address)
        const signer: Signer = hre.ethers.provider.getSigner()
        const lzAppContract = new Contract(lzAppDeployment.address, lzAppDeployment.abi, signer)

        // Validate `from` and `to` details
        if (!lzApp.address || !to.address) {
            console.error(`Error: Missing local or remote LzApp address.`)
            return undefined
        }

        // Encode the path (remote address followed by local address)
        const path = utils.solidityPack(
            ['address', 'address'],
            [addressToBytes32(to.address), ethers.utils.getAddress(lzApp.address)]
        )

        const setTrustedRemoteTx = {
            point: lzApp,
            data: lzAppContract.interface.encodeFunctionData('setTrustedRemote', [to.eid, path]),
            description: `Set trusted remote for Endpoint ID ${to.eid}`,
        }
        return setTrustedRemoteTx
    } catch (error) {
        console.error(`Error setting trusted remote: ${(error as Error).message}`)
    }
}

/**
 * Retrieves the trusted remote address for a given chain ID.
 * @param hre {HardhatRuntimeEnvironment} - Hardhat runtime environment.
 * @param lzApp {OmniPoint} - The LzApp identifier containing contract name or address.
 * @param remoteChainId {number} - The remote chain ID for which to fetch the trusted remote address.
 * @returns {Promise<string | null>} - The trusted remote address or null if not found.
 */
export async function getTrustedRemote(
    hre: HardhatRuntimeEnvironment,
    lzApp: OmniPoint,
    dstEid: number
): Promise<string | null> {
    try {
        // Define the LzApp contract
        const lzAppDeployment = await hre.deployments.get(lzApp.contractName || lzApp.address)
        const signer: Signer = hre.ethers.provider.getSigner()
        const lzAppContract = new Contract(lzAppDeployment.address, lzAppDeployment.abi, signer)

        // Call the contract's getter function
        const path: string = await lzAppContract.trustedRemoteLookup(dstEid)

        if (path === '0x') {
            return path
        }

        // Decode the path to retrieve the remote address
        const remoteAddress = path.slice(0, path.length - 40) // Remove the last 20 bytes (local address)
        return remoteAddress
    } catch (error) {
        console.error(`Error getting trusted remote: ${(error as Error).message}`)
        return null
    }
}

/**
 * Configures the LzApp graph by generating transactions for each connection.
 */
export const configureLzAppGraph = async (
    graph: LzAppOmniGraph,
    hre: HardhatRuntimeEnvironment
): Promise<OmniTransaction[]> => {
    const logger = createModuleLogger('LzApp')
    const getHreByEid = createGetHreByEid(hre)

    return flattenTransactions(
        (
            await Promise.all(
                graph.connections.map(async ({ vector: { from, to }, config }) => {
                    logger.verbose(`Configuring connection: ${from.eid} → ${to.eid}`)

                    const hreForEid = await getHreByEid(from.eid)
                    if (!hreForEid) {
                        logger.error(`Failed to get hre for EID: ${from.eid}`)
                        return []
                    }

                    // Ensure properties exist on `config`
                    const typedConfig = config as OAppEdgeConfig
                    if (
                        !typedConfig.sendLibrary ||
                        !typedConfig.receiveLibraryConfig?.receiveLibrary ||
                        !typedConfig.sendConfig?.executorConfig ||
                        !typedConfig.sendConfig?.ulnConfig ||
                        !typedConfig.receiveConfig?.ulnConfig
                    ) {
                        logger.error(`Missing configuration properties for connection from ${from.eid} to ${to.eid}`)
                        return []
                    }

                    const transactions: OmniTransaction[] = []

                    try {
                        logger.info('Checking LzApp trusted remotes configuration')
                        const currentTrustedRemote = await getTrustedRemote(hreForEid, from, to.eid)
                        if (currentTrustedRemote === null) {
                            throw new Error(`Failed to retrieve trusted remote for ${from.eid} → ${to.eid}`)
                        }

                        const newRemote = addressToBytes32(to.address).toString()

                        const currentRemote = addressToBytes32(currentTrustedRemote).toString()

                        if (currentRemote !== newRemote) {
                            const setTrustedRemoteTx = await setTrustedRemote(hreForEid, from, to)
                            if (setTrustedRemoteTx) transactions.push(setTrustedRemoteTx)
                        }
                        logger.info(`${SUCCESS_SYMBOL} Checked LzApp trusted remotes configuration`)
                        // Generate transactions using the retrieved hre
                        logger.info(`Checking LzApp send libraries configuration`)

                        if (!from.contractName) {
                            throw new Error(`Failed to retrieve contract name for ${from.eid}`)
                        }

                        const LzApp = await hreForEid.deployments.get(from.contractName)
                        if (!LzApp) {
                            throw new Error(`Failed to retrieve LzApp deployment for ${from.contractName}`)
                        }

                        const getSendLibrary = await getEpv1SendLibraryAddress(hreForEid, LzApp.address)
                        if (!getSendLibrary) {
                            throw new Error(`Failed to retrieve Send Library address for ${LzApp.address}`)
                        }

                        if (getSendLibrary !== typedConfig.sendLibrary) {
                            const sendLibraryTx = await setSendLibrary(hreForEid, from, typedConfig.sendLibrary)
                            if (sendLibraryTx) transactions.push(sendLibraryTx)
                        }
                        logger.info(`${SUCCESS_SYMBOL} Checked LzApp send libraries configuration`)

                        logger.info(`Checking LzApp receive libraries configuration`)
                        const getReceiveLibrary = await getEpv1ReceiveLibraryAddress(hreForEid, to.eid, LzApp.address)
                        if (!getReceiveLibrary) {
                            throw new Error(`Failed to retrieve Receive Library address for ${LzApp.address}`)
                        }

                        if (getReceiveLibrary !== typedConfig.receiveLibraryConfig.receiveLibrary) {
                            const receiveLibraryTx = await setReceiveLibrary(
                                hreForEid,
                                from,
                                typedConfig.receiveLibraryConfig.receiveLibrary
                            )
                            if (receiveLibraryTx) transactions.push(receiveLibraryTx)
                        }
                        logger.info(`${SUCCESS_SYMBOL} Checked LzApp receive libraries configuration`)

                        logger.info(`Checking LzApp uln configuration`)
                        const getExecutorConfig = await getEpv1ExecutorConfig(hreForEid, to.eid, LzApp.address)
                        if (!getExecutorConfig) {
                            throw new Error(`Failed to retrieve Executor Config for ${LzApp.address}`)
                        }

                        if (
                            getExecutorConfig.executor.toLowerCase() !==
                                typedConfig.sendConfig.executorConfig.executor.toLowerCase() ||
                            BigInt(getExecutorConfig.maxMessageSize) !==
                                BigInt(typedConfig.sendConfig.executorConfig.maxMessageSize)
                        ) {
                            console.log(getExecutorConfig)
                            const executorTx = await setExecutorConfig(hreForEid, from, typedConfig, to.eid)
                            if (executorTx) transactions.push(executorTx)
                        }

                        const getSendUlnConfig = await getEpv1SendUlnConfig(hreForEid, to.eid, LzApp.address)
                        const getReceiveUlnConfig = await getEpv1ReceiveUlnConfig(hreForEid, to.eid, LzApp.address)

                        if (!getSendUlnConfig || !getReceiveUlnConfig) {
                            throw new Error(`Failed to retrieve ULN Config for ${LzApp.address}`)
                        }

                        encodeUlnConfig(getSendUlnConfig as Uln302UlnConfig) !==
                            encodeUlnConfig(typedConfig!.sendConfig!.ulnConfig as Uln302UlnConfig) ||
                        encodeUlnConfig(getReceiveUlnConfig as Uln302UlnConfig) !==
                            encodeUlnConfig(typedConfig!.receiveConfig!.ulnConfig as Uln302UlnConfig)
                            ? transactions.push(...(await setUlnConfig(hreForEid, from, typedConfig, to.eid)))
                            : null
                        logger.info(`${SUCCESS_SYMBOL} Checked LzApp uln configuration`)
                        logger.info(`${SUCCESS_SYMBOL} Checked LzApp configuration`)
                    } catch (error) {
                        logger.error(`Error configuring connection from ${from.eid} to ${to.eid}: ${error}`)
                        throw error
                    }

                    // Combine all transactions for this connection
                    return transactions
                })
            )
        )
            .flat()
            .filter((tx): tx is OmniTransaction => tx !== undefined)
    )
}
