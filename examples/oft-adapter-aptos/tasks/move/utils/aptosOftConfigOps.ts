import * as fs from 'fs'
import * as path from 'path'

import { InputGenerateTransactionPayloadData } from '@aptos-labs/ts-sdk'

import { EndpointId, Stage, endpointIdToStage, getNetworkForChainId } from '@layerzerolabs/lz-definitions-v3'
import { ExecutorOptionType, Options } from '@layerzerolabs/lz-v2-utilities-v3'

import { Endpoint } from '../../../sdk/endpoint'
import { MsgLib } from '../../../sdk/msgLib'
import { OFT } from '../../../sdk/oft'
import { createEidToNetworkMapping, diffPrinter } from '../../shared/utils'

import { createSerializableUlnConfig } from './ulnConfigBuilder'

import { ExecutorConfig, UlnConfig } from '.'

import type { OAppOmniGraphHardhat, Uln302ExecutorConfig } from '@layerzerolabs/toolbox-hardhat'

export type TransactionPayload = {
    payload: InputGenerateTransactionPayloadData
    description: string
    eid: EndpointId
}

// Configuration Types as used in Aptos Message Libraries
enum ConfigType {
    EXECUTOR = 1,
    SEND_ULN = 2,
    RECV_ULN = 3,
}

const configTypeToNameMap = {
    [ConfigType.SEND_ULN]: 'Send',
    [ConfigType.RECV_ULN]: 'Receive',
    [ConfigType.EXECUTOR]: 'Executor',
}

export async function transferOwner(oft: OFT, owner: string, eid: EndpointId): Promise<TransactionPayload | null> {
    const currOwner = await oft.getAdmin()
    if (currOwner == owner) {
        console.log(`✅ Owner already set to ${owner}\n`)
        return null
    } else {
        diffPrinter(`Set Owner for Aptos OFT at ${oft.oft_address}`, { address: currOwner }, { address: owner })
        const tx = oft.transferAdminPayload(owner)
        return { payload: tx, description: 'Transfer Owner', eid: eid }
    }
}

export async function setDelegate(oft: OFT, delegate: string, eid: EndpointId): Promise<TransactionPayload | null> {
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

        const tx = oft.setDelegatePayload(delegate)
        return { payload: tx, description: 'Set Delegate', eid: eid }
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

export async function createSetPeerTxs(
    oft: OFT,
    connections: OAppOmniGraphHardhat['connections']
): Promise<TransactionPayload[]> {
    const eidToNetworkMapping = createEidToNetworkMapping()

    const txs = []
    for (const entry of connections) {
        if (!entry.to.contractName) {
            printNotSet('peer', entry)
            continue
        }
        const networkName = eidToNetworkMapping[entry.to.eid]
        validateNetwork(networkName, entry)
        const contractAddress = getContractAddress(networkName, entry.to.contractName)
        const newPeer = toAptosAddress(contractAddress)
        const currentPeerHex = await getCurrentPeer(oft, entry.to.eid as EndpointId)

        if (currentPeerHex === newPeer) {
            printAlreadySet('peer', entry)
        } else {
            const diffMessage = createDiffMessage('peer', entry)
            diffPrinter(diffMessage, { address: currentPeerHex }, { address: newPeer })

            const tx = oft.setPeerPayload(entry.to.eid as EndpointId, newPeer)
            txs.push({ payload: tx, description: buildTransactionDescription('Set Peer', entry), eid: entry.to.eid })
        }
    }

    return txs
}

function validateNetwork(networkName: string, entry: OAppOmniGraphHardhat['connections'][number]) {
    if (!networkName) {
        const toNetwork = getNetworkForChainId(entry.to.eid)
        throw new Error(`Network not found in Hardhat config for ${toNetwork.chainName}-${toNetwork.env}`)
    }
}

export async function createSetReceiveLibraryTimeoutTxs(
    oft: OFT,
    endpoint: Endpoint,
    connections: OAppOmniGraphHardhat['connections']
): Promise<TransactionPayload[]> {
    const txs = []
    for (const entry of connections) {
        if (!entry.config?.receiveLibraryTimeoutConfig) {
            printNotSet('Receive library timeout', entry)
            continue
        }
        const currentTimeout = await endpoint.getReceiveLibraryTimeout(oft.oft_address, entry.to.eid)
        const currentTimeoutAsBigInt = BigInt(currentTimeout.expiry)

        if (currentTimeoutAsBigInt === BigInt(entry.config.receiveLibraryTimeoutConfig.expiry)) {
            printAlreadySet('Receive library timeout', entry)
            continue
        } else {
            const diffMessage = createDiffMessage(`receive library timeout`, entry)
            diffPrinter(
                diffMessage,
                { timeout: currentTimeoutAsBigInt },
                { timeout: entry.config.receiveLibraryTimeoutConfig.expiry }
            )
            const tx = oft.setReceiveLibraryTimeoutPayload(
                entry.to.eid,
                entry.config.receiveLibraryTimeoutConfig.lib,
                Number(entry.config.receiveLibraryTimeoutConfig.expiry)
            )
            txs.push({
                payload: tx,
                description: buildTransactionDescription('Set Receive Library Timeout', entry),
                eid: entry.to.eid,
            })
        }
    }

    return txs
}

export async function createSetReceiveLibraryTxs(
    oft: OFT,
    endpoint: Endpoint,
    connections: OAppOmniGraphHardhat['connections']
): Promise<TransactionPayload[]> {
    const txs = []
    for (const entry of connections) {
        if (!entry.config?.receiveLibraryConfig?.receiveLibrary) {
            printNotSet('Receive library', entry)
            continue
        }
        const currentReceiveLibrary = await endpoint.getReceiveLibrary(oft.oft_address, entry.to.eid)
        let currentReceiveLibraryAddress = currentReceiveLibrary[0]
        const isFallbackToDefault = currentReceiveLibrary[1]

        // if unset, fallbackToDefault will be true and the receive library should be set regardless of the current value
        if (currentReceiveLibraryAddress === entry.config.receiveLibraryConfig.receiveLibrary && !isFallbackToDefault) {
            printAlreadySet('Receive library', entry)
            continue
        } else {
            if (isFallbackToDefault) {
                currentReceiveLibraryAddress = 'default: ' + currentReceiveLibraryAddress
            }
            const diffMessage = createDiffMessage('receive library', entry)
            diffPrinter(
                diffMessage,
                { address: currentReceiveLibraryAddress },
                { address: entry.config.receiveLibraryConfig.receiveLibrary }
            )
            const tx = await oft.setReceiveLibraryPayload(
                entry.to.eid,
                entry.config.receiveLibraryConfig.receiveLibrary,
                Number(entry.config.receiveLibraryConfig.gracePeriod || 0)
            )
            txs.push({
                payload: tx,
                description: buildTransactionDescription('Set Receive Library', entry),
                eid: entry.to.eid,
            })
        }
    }

    return txs
}

export async function createSetEnforcedOptionsTxs(
    oft: OFT,
    connections: OAppOmniGraphHardhat['connections']
): Promise<TransactionPayload[]> {
    const txs = []
    for (const entry of connections) {
        if (!entry.config?.enforcedOptions) {
            printNotSet('Enforced options', entry)
            continue
        }

        const msgTypes = [1, 2]
        for (const msgType of msgTypes) {
            const options = getOptionsByMsgType(entry, msgType)
            const tx = await createTxFromOptions(options, entry, oft, msgType)
            if (tx) {
                txs.push({
                    payload: tx,
                    description: buildTransactionDescription('Set Enforced Options', entry),
                    eid: entry.to.eid,
                })
            }
        }
    }

    return txs

    function getOptionsByMsgType(entry: OAppOmniGraphHardhat['connections'][number], msgType: number): any[] {
        const options = []
        for (const enforcedOption of entry.config?.enforcedOptions ?? []) {
            if (enforcedOption.msgType === msgType) {
                options.push(enforcedOption)
            }
        }
        return options
    }
}

export async function createSetSendLibraryTxs(
    oft: OFT,
    endpoint: Endpoint,
    connections: OAppOmniGraphHardhat['connections']
) {
    const txs = []
    for (const entry of connections) {
        if (!entry.config?.sendLibrary) {
            printNotSet('Send library', entry)
            continue
        }
        const currentSendLibrary = await endpoint.getSendLibrary(oft.oft_address, entry.to.eid)
        let currentSendLibraryAddress = currentSendLibrary[0]
        const isFallbackToDefault = currentSendLibrary[1]

        // if unset, fallbackToDefault will be true and the receive library should be set regardless of the current value
        if (currentSendLibraryAddress === entry.config.sendLibrary && !isFallbackToDefault) {
            printAlreadySet('Send library', entry)
            continue
        } else {
            if (isFallbackToDefault) {
                currentSendLibraryAddress = 'default: ' + currentSendLibraryAddress
            }
            const diffMessage = createDiffMessage('send library', entry)
            diffPrinter(diffMessage, { address: currentSendLibraryAddress }, { address: entry.config.sendLibrary })
            const tx = oft.setSendLibraryPayload(entry.to.eid, entry.config.sendLibrary)
            txs.push({
                payload: tx,
                description: buildTransactionDescription('Set Send Library', entry),
                eid: entry.to.eid,
            })
        }
    }

    return txs
}

export async function createSetSendConfigTxs(
    oft: OFT,
    endpoint: Endpoint,
    connections: OAppOmniGraphHardhat['connections']
): Promise<TransactionPayload[]> {
    const txs = []
    for (const entry of connections) {
        if (!entry.config?.sendConfig) {
            printNotSet('Send config', entry)
            continue
        }
        if (!entry.config.sendConfig.ulnConfig) {
            printNotSet('Send config', entry)
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

        await checkNewConfig(
            new MsgLib(oft.moveVMConnection, currentSendLibraryAddress),
            newUlnConfig,
            entry,
            ConfigType.SEND_ULN
        )

        // We need to re-serialize the current config to compare it with the new config to ensure same format
        const serializedCurrentConfig = UlnConfig.serialize(entry.to.eid as EndpointId, currUlnConfig)

        const newSerializedUlnConfig = UlnConfig.serialize(entry.to.eid as EndpointId, newUlnConfig)

        if (Buffer.from(serializedCurrentConfig).equals(Buffer.from(newSerializedUlnConfig))) {
            printAlreadySet('Send config', entry)
            continue
        } else {
            const diffMessage = createDiffMessage('send config', entry)
            diffPrinter(diffMessage, currUlnConfig, newUlnConfig)

            // If the send library config is not set, we use the current send library address
            const sendLibAddress = entry.config?.sendLibrary ?? currentSendLibraryAddress

            const tx = oft.setConfigPayload(sendLibAddress, ConfigType.SEND_ULN, newSerializedUlnConfig)
            txs.push({
                payload: tx,
                description: buildTransactionDescription('Set Send Config', entry),
                eid: entry.to.eid,
            })
        }
    }

    return txs
}

export async function createSetReceiveConfigTxs(
    oft: OFT,
    endpoint: Endpoint,
    connections: OAppOmniGraphHardhat['connections']
): Promise<TransactionPayload[]> {
    const txs = []
    for (const entry of connections) {
        if (!entry.config?.receiveConfig) {
            printNotSet('Receive config', entry)
            continue
        }
        if (!entry.config.receiveConfig.ulnConfig) {
            printNotSet('Receive ULN config', entry)
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

        await checkNewConfig(
            new MsgLib(oft.moveVMConnection, currentReceiveLibraryAddress),
            newUlnConfig,
            entry,
            ConfigType.RECV_ULN
        )

        // We need to re-serialize the current config to compare it with the new config to ensure same format
        const serializedCurrentConfig = UlnConfig.serialize(entry.to.eid as EndpointId, currUlnConfig)

        const newSerializedUlnConfig = UlnConfig.serialize(entry.to.eid as EndpointId, newUlnConfig)

        if (Buffer.from(serializedCurrentConfig).equals(Buffer.from(newSerializedUlnConfig))) {
            printAlreadySet('Receive config', entry)
            continue
        } else {
            const diffMessage = createDiffMessage('receive config', entry)
            diffPrinter(diffMessage, currUlnConfig, newUlnConfig)

            // If the receive library config is not set, we use the current receive library address
            const receiveLibAddress = entry.config?.receiveLibraryConfig?.receiveLibrary ?? currentReceiveLibraryAddress

            const tx = oft.setConfigPayload(receiveLibAddress, ConfigType.RECV_ULN, newSerializedUlnConfig)
            txs.push({
                payload: tx,
                description: buildTransactionDescription('Set Receive Config', entry),
                eid: entry.to.eid,
            })
        }
    }

    return txs
}

export async function createSetExecutorConfigTxs(
    oft: OFT,
    endpoint: Endpoint,
    connections: OAppOmniGraphHardhat['connections']
): Promise<TransactionPayload[]> {
    const txs = []
    for (const entry of connections) {
        if (!entry.config?.sendConfig?.executorConfig) {
            printNotSet('Executor config', entry)
            continue
        }
        const newExecutorConfig = createSerializableExecutorConfig(entry.config.sendConfig.executorConfig)
        const currentSendLibrary = await endpoint.getSendLibrary(oft.oft_address, entry.to.eid)
        const currentSendLibraryAddress = currentSendLibrary[0]

        const currHexSerializedExecutorConfig = await endpoint.getConfig(
            oft.oft_address,
            currentSendLibraryAddress,
            entry.to.eid as EndpointId,
            ConfigType.EXECUTOR
        )

        const currExecutorConfig = ExecutorConfig.deserialize(currHexSerializedExecutorConfig)
        currExecutorConfig.executor_address = '0x' + currExecutorConfig.executor_address
        // We need to re-serialize the current config to compare it with the new config to ensure same format
        const serializedCurrentConfig = ExecutorConfig.serialize(entry.to.eid as EndpointId, currExecutorConfig)

        const newSerializedExecutorConfig = ExecutorConfig.serialize(entry.to.eid as EndpointId, newExecutorConfig)

        if (Buffer.from(serializedCurrentConfig).equals(Buffer.from(newSerializedExecutorConfig))) {
            printAlreadySet('Executor config', entry)
            continue
        } else {
            const diffMessage = createDiffMessage('executor config', entry)
            diffPrinter(diffMessage, currExecutorConfig, newExecutorConfig)

            const sendLibrary = entry.config.sendLibrary ?? currentSendLibraryAddress

            const tx = oft.setConfigPayload(sendLibrary, ConfigType.EXECUTOR, newSerializedExecutorConfig)
            txs.push({
                payload: tx,
                description: buildTransactionDescription('setExecutorConfig', entry),
                eid: entry.to.eid,
            })
        }
    }

    return txs
}

// getPeer errors if there is no peer set, so we need to check if there is a peer before calling getPeer
async function getCurrentPeer(oft: OFT, eid: EndpointId): Promise<string> {
    const hasPeer = await oft.hasPeer(eid)
    return hasPeer ? await oft.getPeer(eid) : ''
}

function getContractAddress(networkName: string, contractName: string | null | undefined) {
    const deploymentPath = path.join(process.cwd(), `/deployments/${networkName}/${contractName}.json`)

    try {
        const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'))
        return deployment.address
    } catch (error) {
        throw new Error(`Failed to read deployment file for network ${networkName}: ${error}\n`)
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

async function createTxFromOptions(
    options: Options[],
    entry: OAppOmniGraphHardhat['connections'][number],
    oft: OFT,
    msgType: number
): Promise<InputGenerateTransactionPayloadData | null> {
    const newOptions = Options.newOptions()
    for (const enforcedOption of options) {
        addOptions(enforcedOption, newOptions)
    }
    const currentOptionsHex = ensureOptionsCompatible(await oft.getEnforcedOptions(entry.to.eid, msgType))

    if (newOptions.toHex() === currentOptionsHex) {
        printAlreadySet('Enforced options', entry)
        return null
    } else {
        decodeOptionsAndPrintDiff(entry, currentOptionsHex, newOptions.toHex(), msgType)
        const tx = oft.setEnforcedOptionsPayload(entry.to.eid, msgType, newOptions.toBytes())
        return tx
    }
}

function decodeOptionsAndPrintDiff(
    entry: OAppOmniGraphHardhat['connections'][number],
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
    const diffMessage = createDiffMessage(`enforced options with message type: ${msgType}`, entry)
    diffPrinter(diffMessage, currentOptions, newOptions)
}

// Default options return from aptos are 0x, however the options decoder expects 0x00
function ensureOptionsCompatible(optionsHex: string): string {
    if (optionsHex === '0x') {
        return '0x00'
    }
    return optionsHex
}

async function checkNewConfig(
    msgLib: MsgLib,
    newUlnConfig: UlnConfig,
    entry: OAppOmniGraphHardhat['connections'][number],
    configType: ConfigType
) {
    // Check if the new config has less DVNs than the default one and warn if it does
    if (
        newUlnConfig.required_dvns.length + newUlnConfig.optional_dvns.length < 2 &&
        endpointIdToStage(entry.from.eid) === Stage.MAINNET
    ) {
        console.log(createWarningMessage(configType, entry))
        console.log(`\tConfig has less than 2 DVNs.\n\tWe strongly recommend setting at least 2 DVNs for mainnet.\n`)
    }

    // Check if the new config has less confirmations than the default one and warn if it does
    if (configType === ConfigType.RECV_ULN) {
        const defaultReceiveConfig = await msgLib.get_default_uln_receive_config(entry.to.eid)
        const defaultConfirmations = defaultReceiveConfig.confirmations
        if (newUlnConfig.confirmations < defaultConfirmations) {
            console.log(createWarningMessage(configType, entry))
            console.log(
                `\tConfig has less than ${defaultConfirmations} block confirmations.\n\tWe recommend setting at least ${defaultConfirmations} block confirmations.\n`
            )
        }
    } else if (configType === ConfigType.SEND_ULN) {
        const defaultSendConfig = await msgLib.get_default_uln_send_config(entry.to.eid)
        const defaultConfirmations = defaultSendConfig.confirmations
        if (newUlnConfig.confirmations < defaultConfirmations) {
            console.log(createWarningMessage(configType, entry))
            console.log(
                `\tConfig has less than ${defaultConfirmations} block confirmations.\n\tWe recommend setting at least ${defaultConfirmations} block confirmations.\n`
            )
        }
    }
}

function createSerializableExecutorConfig(executorConfig: Uln302ExecutorConfig): ExecutorConfig {
    return {
        max_message_size: executorConfig.maxMessageSize,

        executor_address: executorConfig.executor,
    }
}

function createDiffMessage(elementDesc: string, entry: OAppOmniGraphHardhat['connections'][number]) {
    const toNetwork = getNetworkForChainId(entry.to.eid)
    const fromNetwork = getNetworkForChainId(entry.from.eid)
    return `Set ${elementDesc} for pathway ${entry.from.contractName} on ${fromNetwork.chainName}-${fromNetwork.env} -> ${toNetwork.chainName}-${toNetwork.env}`
}

function printAlreadySet(configObject: string, entry: OAppOmniGraphHardhat['connections'][number]) {
    const toNetwork = getNetworkForChainId(entry.to.eid)
    const fromNetwork = getNetworkForChainId(entry.from.eid)
    console.log(
        `✅ ${configObject} already set or pathway ${fromNetwork.chainName}-${fromNetwork.env} -> ${toNetwork.chainName}-${toNetwork.env}\n`
    )
}

function printNotSet(configObject: string, entry: OAppOmniGraphHardhat['connections'][number]) {
    const toNetwork = getNetworkForChainId(entry.to.eid)
    const fromNetwork = getNetworkForChainId(entry.from.eid)
    console.log(
        `No ${configObject} specified for pathway ${fromNetwork.chainName}-${fromNetwork.env} -> ${toNetwork.chainName}-${toNetwork.env}\n`
    )
}

function createWarningMessage(configType: ConfigType, entry: OAppOmniGraphHardhat['connections'][number]) {
    const fromNetwork = getNetworkForChainId(entry.from.eid)
    const toNetwork = getNetworkForChainId(entry.to.eid)
    return `⚠️ WARN: ${configTypeToNameMap[configType]} config for ${fromNetwork.chainName}-${fromNetwork.env} -> ${toNetwork.chainName}-${toNetwork.env}`
}

function buildTransactionDescription(action: string, connections: OAppOmniGraphHardhat['connections'][number]): string {
    const fromNetwork = getNetworkForChainId(connections.from.eid)
    const toNetwork = getNetworkForChainId(connections.to.eid)

    return `${action} from ${fromNetwork.chainName}-${fromNetwork.env} -> ${toNetwork.chainName}-${toNetwork.env}`
}
