import { OFT } from '../../sdk/oft'
import * as fs from 'fs'
import * as path from 'path'
import type { OAppOmniGraphHardhat, Uln302ExecutorConfig } from '@layerzerolabs/toolbox-hardhat'
import { createEidToNetworkMapping, diffPrinter } from './utils'
import { ExecutorOptionType, Options, trim0x } from '@layerzerolabs/lz-v2-utilities-v3'
import { ExecutorConfig, UlnConfig } from '.'
import { EndpointId } from '@layerzerolabs/lz-definitions-v3'
import { createSerializableUlnConfig } from './ulnConfigBuilder'
import { Endpoint } from '../../sdk/endpoint'
// Configuration Types as used in this message library
enum ConfigType {
    EXECUTOR = 1,
    SEND_ULN = 2,
    RECV_ULN = 3,
}

export function toAptosAddress(address: string): string {
    if (!address) {
        return '0x' + '0'.repeat(64)
    }
    address = address.toLowerCase()
    const hex = address.replace('0x', '')
    // Ensure the hex string is exactly 64 chars by padding or truncating
    const paddedHex = hex.length > 64 ? hex.slice(-64) : hex.padStart(64, '0')
    return '0x' + paddedHex
}

export async function setPeers(oft: OFT, connections: OAppOmniGraphHardhat['connections']) {
    const eidToNetworkMapping = createEidToNetworkMapping()
    const txs = []

    for (const entry of connections) {
        const networkName = eidToNetworkMapping[entry.to.eid]
        const newPeer = toAptosAddress(getContractAddress(networkName, entry.to.contractName))
        const currentPeerHex = await oft.getPeer(entry.to.eid as EndpointId)

        if (currentPeerHex === newPeer) {
            console.log(`Peer already set for ${networkName} (${entry.to.eid}) address: ${newPeer} ✓\n`)
        } else {
            diffPrinter(
                `Set peer from Aptos to ${networkName} (${entry.to.eid})`,
                { address: currentPeerHex },
                { address: newPeer }
            )
            const tx = await oft.setPeerPayload(entry.to.eid as EndpointId, newPeer)
            txs.push(tx)
        }
    }

    return txs
}

function getContractAddress(networkName: string, contractName: string) {
    const deploymentPath = path.join(process.cwd(), `/deployments/${networkName}/${contractName}.json`)

    try {
        const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'))
        return deployment.address
    } catch (error) {
        throw new Error(`Failed to read deployment file for network ${networkName}: ${error}\n`)
    }
}

export async function setEnforcedOptions(oft: OFT, connections: OAppOmniGraphHardhat['connections']) {
    const txs = []
    console.log(`connections: ${connections}`)
    for (const entry of connections) {
        if (!entry.config?.enforcedOptions) {
            console.log(`No enforced options specified for contract ${entry.to.contractName} on eid ${entry.to.eid}\n`)
            continue
        }

        const msgTypes = [1, 2]
        for (const msgType of msgTypes) {
            const options = getOptionsByMsgType(entry, msgType)
            const tx = await createTxFromOptions(options, entry.to.eid, entry.to.contractName, oft, msgType)
            if (tx) {
                txs.push(tx)
            }
        }
    }

    return txs

    function getOptionsByMsgType(entry, msgType) {
        const options = []
        for (const enforcedOption of entry.config.enforcedOptions) {
            if (enforcedOption.msgType === msgType) {
                options.push(enforcedOption)
            }
        }
        return options
    }
}

function addOptions(enforcedOption: any, options: Options) {
    //TODO: Accept all option types
    if (enforcedOption.optionType === ExecutorOptionType.LZ_RECEIVE) {
        options.addExecutorLzReceiveOption(enforcedOption.gas, enforcedOption.value)
    } else if (enforcedOption.optionType === ExecutorOptionType.NATIVE_DROP) {
        options.addExecutorNativeDropOption(enforcedOption.amount, enforcedOption.receiver)
    }
}

async function createTxFromOptions(options: Options[], eid: number, contractName: string, oft: OFT, msgType: number) {
    const newOptions = Options.newOptions()
    for (const enforcedOption of options) {
        addOptions(enforcedOption, newOptions)
    }
    const currentOptionsHex = ensureOptionsCompatible(await oft.getEnforcedOptions(eid, msgType))

    if (newOptions.toHex() === currentOptionsHex) {
        console.log(`Enforced options already set for ${contractName} on eid ${eid} ✓\n`)
        return null
    } else {
        const currentOptions = Options.fromOptions(currentOptionsHex)
        diffPrinter(`Set enforced options for ${contractName} on eid ${eid}`, { currentOptions }, { newOptions })
        const tx = oft.setEnforcedOptionsPayload(eid, msgType, newOptions.toBytes())
        return tx
    }
}

// Default options return from aptos are 0x, however the options decoder expects 0x00
function ensureOptionsCompatible(optionsHex: string) {
    if (optionsHex === '0x') {
        return '0x00'
    }
    return optionsHex
}

export async function setReceiveLibraryTimeout(
    oft: OFT,
    endpoint: Endpoint,
    connections: OAppOmniGraphHardhat['connections']
) {
    const txs = []
    for (const entry of connections) {
        if (!entry.config?.receiveLibraryTimeoutConfig) {
            console.log(
                `No receive library timeout specified for contract ${entry.to.contractName} on eid ${entry.to.eid}\n`
            )
            continue
        }
        console.log('attempting to fetched the recieve lib timeout')
        console.log(`oftAddress: ${oft.oft_address}`)
        console.log(`entry.to.eid: ${entry.to.eid}`)
        const currentTimeout = await endpoint.getReceiveLibraryTimeout(oft.oft_address, entry.to.eid)
        console.log(`currentTimeout: ${currentTimeout} currentTimeoutType: ${typeof currentTimeout}`)
        console.log(
            `entry.config.receiveLibraryTimeoutConfig.expiry: ${entry.config.receiveLibraryTimeoutConfig.expiry} expiryType: ${typeof entry.config.receiveLibraryTimeoutConfig.expiry}`
        )
        if (currentTimeout === entry.config.receiveLibraryTimeoutConfig.expiry) {
            console.log(
                `Receive library timeout already set for contract ${entry.to.contractName} on eid ${entry.to.eid} ✓\n`
            )
            continue
        } else {
            diffPrinter(
                `Set receive library timeout for contract ${entry.to.contractName} on eid ${entry.to.eid}`,
                { timeout: currentTimeout },
                { timeout: entry.config.receiveLibraryTimeoutConfig.expiry }
            )
            const tx = await oft.setReceiveLibraryTimeoutPayload(
                entry.to.eid,
                entry.config.receiveLibraryTimeoutConfig.lib,
                Number(entry.config.receiveLibraryTimeoutConfig.expiry)
            )
            txs.push(tx)
        }
    }

    return txs
}

export async function setReceiveLibrary(
    oft: OFT,
    endpoint: Endpoint,
    connections: OAppOmniGraphHardhat['connections']
) {
    const txs = []
    for (const entry of connections) {
        if (!entry.config?.receiveLibraryConfig?.receiveLibrary) {
            console.log(`No receive library specified for contract ${entry.to.contractName} on eid ${entry.to.eid}\n`)
            continue
        }
        const currentReceiveLibrary = await endpoint.getReceiveLibrary(oft.oft_address, entry.to.eid)

        if (currentReceiveLibrary === entry.config.receiveLibraryConfig.receiveLibrary) {
            console.log(`Receive library already set for contract ${entry.to.contractName} on eid ${entry.to.eid} ✓\n`)
            continue
        } else {
            diffPrinter(
                `Set receive library for contract ${entry.to.contractName} on eid ${entry.to.eid}`,
                { address: currentReceiveLibrary },
                { address: entry.config.receiveLibraryConfig.receiveLibrary }
            )
            const tx = await oft.setReceiveLibraryPayload(
                entry.to.eid,
                entry.config.receiveLibraryConfig.receiveLibrary,
                Number(entry.config.receiveLibraryConfig.gracePeriod || 0)
            )
            txs.push(tx)
        }
    }

    return txs
}

export async function setSendLibrary(oft: OFT, endpoint: Endpoint, connections: OAppOmniGraphHardhat['connections']) {
    const txs = []
    console.dir(connections, { depth: null })
    for (const entry of connections) {
        if (!entry.config?.sendLibrary) {
            console.log(`No send library specified for contract ${entry.to.contractName} on eid ${entry.to.eid}\n`)
            continue
        }
        const currentSendLibrary = await endpoint.getSendLibrary(oft.oft_address, entry.to.eid)

        if (currentSendLibrary === entry.config.sendLibrary) {
            console.log(`Send library already set for contract ${entry.to.contractName} on eid ${entry.to.eid} ✓\n`)
            continue
        } else {
            diffPrinter(
                `Set send library for contract ${entry.to.contractName} on eid ${entry.to.eid}`,
                { address: currentSendLibrary },
                { address: entry.config.sendLibrary }
            )
            const tx = await oft.setSendLibraryPayload(entry.to.eid, entry.config.sendLibrary)
            txs.push(tx)
        }
    }

    return txs
}

export async function setSendConfig(oft: OFT, endpoint: Endpoint, connections: OAppOmniGraphHardhat['connections']) {
    const txs = []
    for (const entry of connections) {
        if (!entry.config?.sendConfig) {
            console.log(`No send config specified for contract ${entry.to.contractName} on eid ${entry.to.eid}\n`)
            continue
        }
        if (!entry.config.sendConfig.ulnConfig) {
            console.log(`sendConfig.ulnConfig not found for contract ${entry.to.contractName} on eid ${entry.to.eid}\n`)
            continue
        }
        const newUlnConfig = createSerializableUlnConfig(entry.config.sendConfig.ulnConfig, entry.to, entry.from)

        const currHexSerializedUlnConfig = await endpoint.getConfig(
            oft.oft_address,
            entry.config.sendLibrary,
            entry.to.eid as EndpointId,
            ConfigType.SEND_ULN
        )
        const currUlnConfig = UlnConfig.deserialize(currHexSerializedUlnConfig)
        // We need to re-serialize the current config to compare it with the new config to ensure same format
        const serializedCurrentConfig = UlnConfig.serialize(entry.to.eid as EndpointId, currUlnConfig)

        const newSerializedUlnConfig = UlnConfig.serialize(entry.to.eid as EndpointId, newUlnConfig)

        if (Buffer.from(serializedCurrentConfig).equals(Buffer.from(newSerializedUlnConfig))) {
            console.log(`Send config already set for contract ${entry.to.contractName} on eid ${entry.to.eid} ✓\n`)
            continue
        } else {
            diffPrinter(
                `Set send config for contract ${entry.to.contractName} on eid ${entry.to.eid}`,
                currUlnConfig,
                newUlnConfig
            )
            const tx = await oft.setConfigPayload(entry.config.sendLibrary, ConfigType.SEND_ULN, newSerializedUlnConfig)
            txs.push(tx)
        }
    }

    return txs
}

export async function setReceiveConfig(oft: OFT, endpoint: Endpoint, connections: OAppOmniGraphHardhat['connections']) {
    const txs = []
    for (const entry of connections) {
        if (!entry.config?.receiveConfig) {
            console.log(`No receive config specified for contract ${entry.to.contractName} on eid ${entry.to.eid}\n`)
            continue
        }
        if (!entry.config.receiveConfig.ulnConfig) {
            console.log(
                `receiveConfig.ulnConfig not found for contract ${entry.to.contractName} on eid ${entry.to.eid}\n`
            )
            continue
        }
        const newUlnConfig = createSerializableUlnConfig(entry.config.receiveConfig.ulnConfig, entry.to, entry.from)

        const currHexSerializedUlnConfig = await endpoint.getConfig(
            oft.oft_address,
            entry.config.receiveLibraryConfig.receiveLibrary,
            entry.to.eid as EndpointId,
            ConfigType.RECV_ULN
        )

        const currUlnConfig = UlnConfig.deserialize(currHexSerializedUlnConfig)
        // We need to re-serialize the current config to compare it with the new config to ensure same format
        const serializedCurrentConfig = UlnConfig.serialize(entry.to.eid as EndpointId, currUlnConfig)

        const newSerializedUlnConfig = UlnConfig.serialize(entry.to.eid as EndpointId, newUlnConfig)

        if (Buffer.from(serializedCurrentConfig).equals(Buffer.from(newSerializedUlnConfig))) {
            console.log(`Receive config already set for contract ${entry.to.contractName} on eid ${entry.to.eid} ✓\n`)
            continue
        } else {
            diffPrinter(
                `Set receive config for contract ${entry.to.contractName} on eid ${entry.to.eid}`,
                currUlnConfig,
                newUlnConfig
            )

            const tx = await oft.setConfigPayload(
                entry.config.receiveLibraryConfig.receiveLibrary,
                ConfigType.RECV_ULN,
                newSerializedUlnConfig
            )
            txs.push(tx)
        }
    }

    return txs
}

export async function setExecutorConfig(
    oft: OFT,
    endpoint: Endpoint,
    connections: OAppOmniGraphHardhat['connections']
) {
    const txs = []
    for (const entry of connections) {
        if (!entry.config?.sendConfig?.executorConfig) {
            console.log(`ExecutorConfig not found for contract ${entry.to.contractName} on eid ${entry.to.eid}\n`)
            continue
        }
        console.log(
            `entry.config.sendConfig.executorConfig.executor: ${entry.config.sendConfig.executorConfig.executor}`
        )
        const newExecutorConfig = createSerializableExecutorConfig(entry.config.sendConfig.executorConfig)

        const currHexSerializedExecutorConfig = await endpoint.getConfig(
            oft.oft_address,
            entry.config.sendLibrary,
            entry.to.eid as EndpointId,
            ConfigType.EXECUTOR
        )

        console.log(`currHexSerializedExecutorConfig: ${currHexSerializedExecutorConfig}`)

        const currExecutorConfig = ExecutorConfig.deserialize(currHexSerializedExecutorConfig)
        currExecutorConfig.executor_address = '0x' + currExecutorConfig.executor_address
        // We need to re-serialize the current config to compare it with the new config to ensure same format
        const serializedCurrentConfig = ExecutorConfig.serialize(entry.to.eid as EndpointId, currExecutorConfig)

        const newSerializedExecutorConfig = ExecutorConfig.serialize(entry.to.eid as EndpointId, newExecutorConfig)

        if (Buffer.from(serializedCurrentConfig).equals(Buffer.from(newSerializedExecutorConfig))) {
            console.log(`Receive config already set for contract ${entry.to.contractName} on eid ${entry.to.eid} ✓\n`)
            continue
        } else {
            diffPrinter(
                `Set receive config for contract ${entry.to.contractName} on eid ${entry.to.eid}`,
                currExecutorConfig,
                newExecutorConfig
            )

            const tx = await oft.setConfigPayload(
                entry.config.sendLibrary,
                ConfigType.EXECUTOR,
                newSerializedExecutorConfig
            )
            txs.push(tx)
        }
    }

    return txs
}

function createSerializableExecutorConfig(executorConfig: Uln302ExecutorConfig): ExecutorConfig {
    return {
        max_message_size: executorConfig.maxMessageSize,

        executor_address: executorConfig.executor,
    }
}
