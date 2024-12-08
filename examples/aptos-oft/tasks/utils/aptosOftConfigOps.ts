import { OFT } from '../../sdk/oft'
import * as fs from 'fs'
import * as path from 'path'
import type { OAppOmniGraphHardhat, Uln302ExecutorConfig } from '@layerzerolabs/toolbox-hardhat'
import { createEidToNetworkMapping, diffPrinter } from './utils'
import { ExecutorOptionType, Options } from '@layerzerolabs/lz-v2-utilities-v3'
import { ExecutorConfig, UlnConfig } from '.'
import { EndpointId, endpointIdToStage, getNetworkForChainId, Stage } from '@layerzerolabs/lz-definitions-v3'
import { createSerializableUlnConfig } from './ulnConfigBuilder'
import { Endpoint } from '../../sdk/endpoint'
import { InputGenerateTransactionPayloadData } from '@aptos-labs/ts-sdk'
import { MsgLib } from '../../sdk/msgLib'

// Configuration Types as used in Aptos Message Libraries
enum ConfigType {
    EXECUTOR = 1,
    SEND_ULN = 2,
    RECV_ULN = 3,
}

export async function transferOwner(oft: OFT, owner: string): Promise<InputGenerateTransactionPayloadData> {
    const currOwner = await oft.getAdmin()
    if (currOwner == owner) {
        console.log(`✅ Owner already set to ${owner}\n`)
        return null
    } else {
        diffPrinter(`Set Owner for Aptos OFT at ${oft.oft_address}`, { address: currOwner }, { address: owner })
        return oft.transferAdminPayload(owner)
    }
}

export async function setDelegate(oft: OFT, delegate: string): Promise<InputGenerateTransactionPayloadData> {
    const currDelegate = await oft.getDelegate()
    if (currDelegate == delegate) {
        console.log(`✅ Delegate already set to ${delegate}\n`)
        return null
    } else {
        diffPrinter(
            `Set Delegate for Aptos OFT at ${oft.oft_address}`,
            { address: currDelegate },
            { address: delegate }
        )

        return oft.setDelegatePayload(delegate)
    }
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
        const currentPeerHex = await getCurrentPeer(oft, entry.to.eid as EndpointId)

        if (currentPeerHex === newPeer) {
            printAlreadySet('Peer', entry.to.contractName, getNetworkForChainId(entry.to.eid))
        } else {
            diffPrinter(
                `Set peer from Aptos OFT -> ${entry.to.contractName} on ${getNetworkForChainId(entry.to.eid).chainName}`,
                { address: currentPeerHex },
                { address: newPeer }
            )
            const tx = await oft.setPeerPayload(entry.to.eid as EndpointId, newPeer)
            txs.push(tx)
        }
    }

    return txs
}

// getPeer errors if there is no peer set, so we need to check if there is a peer before calling getPeer
async function getCurrentPeer(oft: OFT, eid: EndpointId): Promise<string> {
    const hasPeer = await oft.hasPeer(eid)
    return hasPeer ? await oft.getPeer(eid) : ''
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
    for (const entry of connections) {
        if (!entry.config?.enforcedOptions) {
            printNotSet('Enforced options', entry.to.contractName, getNetworkForChainId(entry.to.eid))
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
    if (enforcedOption.optionType === ExecutorOptionType.LZ_RECEIVE) {
        options.addExecutorLzReceiveOption(enforcedOption.gas, enforcedOption.value)
    } else if (enforcedOption.optionType === ExecutorOptionType.NATIVE_DROP) {
        options.addExecutorNativeDropOption(enforcedOption.amount, enforcedOption.receiver)
    } else if (enforcedOption.optionType === ExecutorOptionType.COMPOSE) {
        options.addExecutorComposeOption(enforcedOption.gas, enforcedOption.value)
    } else if (enforcedOption.optionType === ExecutorOptionType.ORDERED) {
        options.addExecutorOrderedExecutionOption()
    } else if (enforcedOption.optionType === ExecutorOptionType.LZ_READ) {
        options.addExecutorLzReadOption(enforcedOption.gas, enforcedOption.value)
    }
}

async function createTxFromOptions(options: Options[], eid: number, contractName: string, oft: OFT, msgType: number) {
    const newOptions = Options.newOptions()
    for (const enforcedOption of options) {
        addOptions(enforcedOption, newOptions)
    }
    const currentOptionsHex = ensureOptionsCompatible(await oft.getEnforcedOptions(eid, msgType))

    if (newOptions.toHex() === currentOptionsHex) {
        printAlreadySet('Enforced options', contractName, getNetworkForChainId(eid))
        return null
    } else {
        decodeOptionsAndPrintDiff(contractName, eid, currentOptionsHex, newOptions.toHex(), msgType)
        const tx = oft.setEnforcedOptionsPayload(eid, msgType, newOptions.toBytes())
        return tx
    }
}

function decodeOptionsAndPrintDiff(
    contractName: string,
    eid: number,
    currentOptionsHex: string,
    newOptionsHex: string,
    msgType: number
) {
    const currentOptionsString = Options.fromOptions(currentOptionsHex)
    const newOptionsString = Options.fromOptions(newOptionsHex)

    // Default empty values based on type definitions
    const emptyDefaults = {
        LzReceiveOption: { gas: undefined, value: undefined },
        NativeDropOption: [] as { amount: bigint; receiver: string }[],
        ComposeOption: [] as { index: number; gas: bigint; value: bigint }[],
        LzReadOption: { gas: undefined, dataSize: undefined, value: undefined },
        OrderedExecutionOption: undefined, // Assuming boolean based on context
    }

    const currentOptions = {
        LzReceiveOption: currentOptionsString.decodeExecutorLzReceiveOption() ?? emptyDefaults.LzReceiveOption,
        NativeDropOption: currentOptionsString.decodeExecutorNativeDropOption() ?? emptyDefaults.NativeDropOption,
        ComposeOption: currentOptionsString.decodeExecutorComposeOption() ?? emptyDefaults.ComposeOption,
        LzReadOption: currentOptionsString.decodeExecutorLzReadOption() ?? emptyDefaults.LzReadOption,
        OrderedExecutionOption:
            currentOptionsString.decodeExecutorOrderedExecutionOption() ?? emptyDefaults.OrderedExecutionOption,
    }

    const newOptions = {
        LzReceiveOption: newOptionsString.decodeExecutorLzReceiveOption() ?? emptyDefaults.LzReceiveOption,
        NativeDropOption: newOptionsString.decodeExecutorNativeDropOption() ?? emptyDefaults.NativeDropOption,
        ComposeOption: newOptionsString.decodeExecutorComposeOption() ?? emptyDefaults.ComposeOption,
        LzReadOption: newOptionsString.decodeExecutorLzReadOption() ?? emptyDefaults.LzReadOption,
        OrderedExecutionOption:
            newOptionsString.decodeExecutorOrderedExecutionOption() ?? emptyDefaults.OrderedExecutionOption,
    }

    diffPrinter(
        `Enforced Options for ${contractName} on eid ${eid} with msgType ${msgType}`,
        currentOptions,
        newOptions
    )
}

// Default options return from aptos are 0x, however the options decoder expects 0x00
function ensureOptionsCompatible(optionsHex: string): string {
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
            printNotSet('Receive library timeout', entry.to.contractName, getNetworkForChainId(entry.to.eid))
            continue
        }
        const currentTimeout = await endpoint.getReceiveLibraryTimeout(oft.oft_address, entry.to.eid)
        const currentTimeoutAsBigInt = BigInt(currentTimeout.expiry)

        if (currentTimeoutAsBigInt === BigInt(entry.config.receiveLibraryTimeoutConfig.expiry)) {
            printAlreadySet('Receive library timeout', entry.to.contractName, getNetworkForChainId(entry.to.eid))
            continue
        } else {
            diffPrinter(
                `Set receive library timeout for pathway Aptos -> ${entry.to.contractName} on ${getNetworkForChainId(entry.to.eid).chainName}`,
                { timeout: currentTimeoutAsBigInt },
                { timeout: entry.config.receiveLibraryTimeoutConfig.expiry }
            )
            const tx = oft.setReceiveLibraryTimeoutPayload(
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
            printNotSet('Receive library', entry.to.contractName, getNetworkForChainId(entry.to.eid))
            continue
        }
        const currentReceiveLibrary = await endpoint.getReceiveLibrary(oft.oft_address, entry.to.eid)
        let currentReceiveLibraryAddress = currentReceiveLibrary[0]
        const isFallbackToDefault = currentReceiveLibrary[1]

        // if unset, fallbackToDefault will be true and the receive library should be set regardless of the current value
        if (currentReceiveLibraryAddress === entry.config.receiveLibraryConfig.receiveLibrary && !isFallbackToDefault) {
            printAlreadySet('Receive library', entry.to.contractName, getNetworkForChainId(entry.to.eid))
            continue
        } else {
            if (isFallbackToDefault) {
                currentReceiveLibraryAddress = 'default: ' + currentReceiveLibraryAddress
            }
            diffPrinter(
                `Set Receive Library for pathway Aptos -> ${entry.to.contractName} on ${getNetworkForChainId(entry.to.eid).chainName}`,
                { address: currentReceiveLibraryAddress },
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
    for (const entry of connections) {
        if (!entry.config?.sendLibrary) {
            printNotSet('Send library', entry.to.contractName, getNetworkForChainId(entry.to.eid))
            continue
        }
        const currentSendLibrary = await endpoint.getSendLibrary(oft.oft_address, entry.to.eid)
        let currentSendLibraryAddress = currentSendLibrary[0]
        const isFallbackToDefault = currentSendLibrary[1]

        // if unset, fallbackToDefault will be true and the receive library should be set regardless of the current value
        if (currentSendLibraryAddress === entry.config.sendLibrary && !isFallbackToDefault) {
            printAlreadySet('Send library', entry.to.contractName, getNetworkForChainId(entry.to.eid))
            continue
        } else {
            if (isFallbackToDefault) {
                currentSendLibraryAddress = 'default: ' + currentSendLibraryAddress
            }
            diffPrinter(
                `Set Send Library for pathway Aptos -> ${entry.to.contractName} on ${getNetworkForChainId(entry.to.eid).chainName}`,
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
            printNotSet('Send config', entry.to.contractName, getNetworkForChainId(entry.to.eid))
            continue
        }
        if (!entry.config.sendConfig.ulnConfig) {
            printNotSet('Send config', entry.to.contractName, getNetworkForChainId(entry.to.eid))
            continue
        }
        const newUlnConfig = createSerializableUlnConfig(entry.config.sendConfig.ulnConfig, entry.to, entry.from)

        const currentSendLibrary = await endpoint.getSendLibrary(oft.oft_address, entry.to.eid)
        const currentSendLibraryAddress = currentSendLibrary[0]
        const currHexSerializedUlnConfig = await endpoint.getConfig(
            oft.oft_address,
            currentSendLibraryAddress,
            entry.to.eid as EndpointId,
            ConfigType.SEND_ULN
        )
        const currUlnConfig = UlnConfig.deserialize(currHexSerializedUlnConfig)

        checkConfig(new MsgLib(oft.aptos, currentSendLibraryAddress), newUlnConfig, entry, ConfigType.SEND_ULN)

        // We need to re-serialize the current config to compare it with the new config to ensure same format
        const serializedCurrentConfig = UlnConfig.serialize(entry.to.eid as EndpointId, currUlnConfig)

        const newSerializedUlnConfig = UlnConfig.serialize(entry.to.eid as EndpointId, newUlnConfig)

        if (Buffer.from(serializedCurrentConfig).equals(Buffer.from(newSerializedUlnConfig))) {
            printAlreadySet('Send config', entry.to.contractName, getNetworkForChainId(entry.to.eid))
            continue
        } else {
            diffPrinter(
                `Set Send Config for pathway Aptos -> ${entry.to.contractName} on ${getNetworkForChainId(entry.to.eid).chainName}`,
                currUlnConfig,
                newUlnConfig
            )

            // If the send library config is not set, we use the current send library address
            let sendLibAddress = currentSendLibraryAddress
            if (entry.config?.sendLibrary) {
                sendLibAddress = entry.config.sendLibrary
            }

            const tx = oft.setConfigPayload(sendLibAddress, ConfigType.SEND_ULN, newSerializedUlnConfig)
            txs.push(tx)
        }
    }

    return txs
}

export async function setReceiveConfig(oft: OFT, endpoint: Endpoint, connections: OAppOmniGraphHardhat['connections']) {
    const txs = []
    for (const entry of connections) {
        if (!entry.config?.receiveConfig) {
            printNotSet('Receive config', entry.to.contractName, getNetworkForChainId(entry.to.eid))
            continue
        }
        if (!entry.config.receiveConfig.ulnConfig) {
            printNotSet('Receive ULN config', entry.to.contractName, getNetworkForChainId(entry.to.eid))
            continue
        }
        const newUlnConfig = createSerializableUlnConfig(entry.config.receiveConfig.ulnConfig, entry.to, entry.from)

        const currentReceiveLibrary = await endpoint.getReceiveLibrary(oft.oft_address, entry.to.eid)
        const currentReceiveLibraryAddress = currentReceiveLibrary[0]

        const currHexSerializedUlnConfig = await endpoint.getConfig(
            oft.oft_address,
            currentReceiveLibraryAddress,
            entry.to.eid as EndpointId,
            ConfigType.RECV_ULN
        )

        const currUlnConfig = UlnConfig.deserialize(currHexSerializedUlnConfig)

        checkConfig(new MsgLib(oft.aptos, currentReceiveLibraryAddress), newUlnConfig, entry, ConfigType.RECV_ULN)

        // We need to re-serialize the current config to compare it with the new config to ensure same format
        const serializedCurrentConfig = UlnConfig.serialize(entry.to.eid as EndpointId, currUlnConfig)

        const newSerializedUlnConfig = UlnConfig.serialize(entry.to.eid as EndpointId, newUlnConfig)

        if (Buffer.from(serializedCurrentConfig).equals(Buffer.from(newSerializedUlnConfig))) {
            printAlreadySet('Receive config', entry.to.contractName, getNetworkForChainId(entry.to.eid))
            continue
        } else {
            diffPrinter(
                `Set Receive Config for pathway Aptos -> ${entry.to.contractName} on ${getNetworkForChainId(entry.to.eid).chainName}`,
                currUlnConfig,
                newUlnConfig
            )

            // If the receive library config is not set, we use the current receive library address
            let receiveLibAddress = currentReceiveLibraryAddress
            if (entry.config?.receiveLibraryConfig?.receiveLibrary) {
                receiveLibAddress = entry.config.receiveLibraryConfig.receiveLibrary
            }

            const tx = oft.setConfigPayload(receiveLibAddress, ConfigType.RECV_ULN, newSerializedUlnConfig)
            txs.push(tx)
        }
    }

    return txs
}

async function checkConfig(msgLib: MsgLib, newUlnConfig: UlnConfig, entry, configType: ConfigType) {
    // Check if the new config has less DVNs than the default one and warn if it does
    if (
        newUlnConfig.required_dvns.length + newUlnConfig.optional_dvns.length < 2 &&
        endpointIdToStage(entry.from.eid) === Stage.MAINNET
    ) {
        console.log(
            `WARN: ${configType} config for ${entry.to.contractName} on ${getNetworkForChainId(entry.to.eid).chainName} has less than 2 DVNs.\nWe strongly recommend setting at least 2 DVNs for mainnet.\n`
        )
    }

    // Check if the new config has less confirmations than the default one and warn if it does
    if (configType === ConfigType.RECV_ULN) {
        const defaultReceiveConfig = await msgLib.get_default_uln_receive_config(entry.to.eid)
        const defaultConfirmations = defaultReceiveConfig.confirmations
        if (newUlnConfig.confirmations < defaultConfirmations) {
            console.log(
                `WARN: Receive config for ${entry.to.contractName} on ${getNetworkForChainId(entry.to.eid).chainName} has less than ${defaultConfirmations} block confirmations. We recommend setting at least ${defaultConfirmations} block confirmations.\n`
            )
        }
    } else if (configType === ConfigType.SEND_ULN) {
        const defaultSendConfig = await msgLib.get_default_uln_send_config(entry.to.eid)
        const defaultConfirmations = defaultSendConfig.confirmations
        if (newUlnConfig.confirmations < defaultConfirmations) {
            console.log(
                `WARN: Send config for ${entry.to.contractName} on ${getNetworkForChainId(entry.to.eid).chainName} has less than ${defaultConfirmations} block confirmations. We recommend setting at least ${defaultConfirmations} block confirmations.\n`
            )
        }
    }
}

export async function setExecutorConfig(
    oft: OFT,
    endpoint: Endpoint,
    connections: OAppOmniGraphHardhat['connections']
) {
    const txs = []
    for (const entry of connections) {
        if (!entry.config?.sendConfig?.executorConfig) {
            printNotSet('Executor config', entry.to.contractName, getNetworkForChainId(entry.to.eid))
            continue
        }
        const newExecutorConfig = createSerializableExecutorConfig(entry.config.sendConfig.executorConfig)

        const currHexSerializedExecutorConfig = await endpoint.getConfig(
            oft.oft_address,
            entry.config.sendLibrary,
            entry.to.eid as EndpointId,
            ConfigType.EXECUTOR
        )

        const currExecutorConfig = ExecutorConfig.deserialize(currHexSerializedExecutorConfig)
        currExecutorConfig.executor_address = '0x' + currExecutorConfig.executor_address
        // We need to re-serialize the current config to compare it with the new config to ensure same format
        const serializedCurrentConfig = ExecutorConfig.serialize(entry.to.eid as EndpointId, currExecutorConfig)

        const newSerializedExecutorConfig = ExecutorConfig.serialize(entry.to.eid as EndpointId, newExecutorConfig)

        if (Buffer.from(serializedCurrentConfig).equals(Buffer.from(newSerializedExecutorConfig))) {
            printAlreadySet('Executor config', entry.to.contractName, getNetworkForChainId(entry.to.eid))
            continue
        } else {
            diffPrinter(
                `Set Executor Config for pathway Aptos -> ${entry.to.contractName} on ${getNetworkForChainId(entry.to.eid).chainName}`,
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

function printAlreadySet(configObject: string, contractName: string, toNetwork: { chainName: string; env: string }) {
    console.log(
        `✅ ${configObject} already set or pathway Aptos -> ${contractName} on ${toNetwork.chainName}-${toNetwork.env}\n`
    )
}

function printNotSet(configObject: string, contractName: string, toNetwork: { chainName: string; env: string }) {
    console.log(
        `No ${configObject} specified for pathway Aptos -> ${contractName} on ${toNetwork.chainName}-${toNetwork.env}\n`
    )
}
