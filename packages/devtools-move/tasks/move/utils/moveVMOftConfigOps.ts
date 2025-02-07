import * as fs from 'fs'
import * as path from 'path'

import {
    ChainType,
    EndpointId,
    Stage,
    endpointIdToChainType,
    endpointIdToStage,
    getNetworkForChainId,
} from '@layerzerolabs/lz-definitions'
import { ExecutorOptionType, Options } from '@layerzerolabs/lz-v2-utilities'

import { Endpoint } from '../../../sdk/endpoint'
import { MsgLib } from '../../../sdk/msgLib'
import { OFT, OFTType, TypedInputGenerateTransactionPayloadData } from '../../../sdk/oft'
import { IOFT } from '../../../sdk/IOFT'
import { createEidToNetworkMapping, diffPrinter } from '../../shared/utils'

import { createSerializableUlnConfig } from './ulnConfigBuilder'

import { ExecutorConfig, UlnConfig } from '.'

import type { OAppOmniGraphHardhat, Uln302ExecutorConfig } from '@layerzerolabs/toolbox-hardhat'
import { decodeSolanaAddress } from '../../shared/basexToBytes32'

export type TransactionPayload = {
    payload: TypedInputGenerateTransactionPayloadData
    description: string
    eid?: EndpointId
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

export async function createTransferOwnerOAppPayload(
    oft: OFT,
    newOwner: string,
    eid: EndpointId
): Promise<TransactionPayload | null> {
    const currOwner = await oft.getAdmin()
    if (currOwner == newOwner) {
        console.log(`✅ Owner already set to ${newOwner}\n`)
        return null
    } else {
        diffPrinter(`Set Owner for OApp at ${oft.oft_address}`, { address: currOwner }, { address: newOwner })
        const tx = oft.transferAdminPayload(newOwner)
        return { payload: tx, description: 'Transfer Owner', eid: eid }
    }
}

export function createTransferObjectOwnerPayload(objectAddress: string, toAddress: string): TransactionPayload {
    return {
        payload: {
            function: '0x1::object::transfer_call',
            functionArguments: [objectAddress, toAddress],
            types: ['address', 'address'],
        },
        description: `Transfer object ${objectAddress} to ${toAddress}`,
    }
}

export async function setDelegate(oft: IOFT, delegate: string, eid: EndpointId): Promise<TransactionPayload | null> {
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

export function toAptosAddress(address: string, eid: string): string {
    if (!address) {
        return '0x' + '0'.repeat(64)
    }

    const chainType = endpointIdToChainType(Number(eid))

    // Handle Solana addresses by decoding base58 first
    if (chainType === ChainType.SOLANA) {
        address = decodeSolanaAddress(address)
    }

    address = address.toLowerCase()
    const hex = address.replace('0x', '')
    // Ensure the hex string is exactly 64 chars by padding or truncating
    const paddedHex = hex.length > 64 ? hex.slice(-64) : hex.padStart(64, '0')
    return '0x' + paddedHex
}

export async function createSetPeerTx(
    oft: OFT,
    connection: OAppOmniGraphHardhat['connections'][number]
): Promise<TransactionPayload | null> {
    const eidToNetworkMapping = await createEidToNetworkMapping()

    if (!connection.to.contractName) {
        printNotSet('peer', connection)
        return null
    }
    const networkName = eidToNetworkMapping[connection.to.eid]
    validateNetwork(networkName, connection)
    const contractAddress = getContractAddress(networkName, connection.to.contractName)
    const newPeer = toAptosAddress(contractAddress, connection.to.eid.toString())
    const currentPeerHex = await getCurrentPeer(oft, connection.to.eid as EndpointId)

    if (currentPeerHex === newPeer) {
        printAlreadySet('peer', connection)
        return null
    } else {
        const diffMessage = createDiffMessage('peer', connection)
        diffPrinter(diffMessage, { address: currentPeerHex }, { address: newPeer })

        const payload = oft.setPeerPayload(connection.to.eid as EndpointId, newPeer)
        return {
            payload: payload,
            description: buildTransactionDescription('Set Peer', connection),
            eid: connection.to.eid as EndpointId,
        }
    }
}

function validateNetwork(networkName: string, entry: OAppOmniGraphHardhat['connections'][number]) {
    if (!networkName) {
        const toNetwork = getNetworkForChainId(entry.to.eid)
        throw new Error(`Network not found in Hardhat config for ${toNetwork.chainName}-${toNetwork.env}`)
    }
}

export async function createSetReceiveLibraryTimeoutTx(
    oft: OFT,
    endpoint: Endpoint,
    connection: OAppOmniGraphHardhat['connections'][number]
): Promise<TransactionPayload | null> {
    if (!connection.config?.receiveLibraryTimeoutConfig) {
        printNotSet('Receive library timeout', connection)
        return null
    }

    const currentTimeout = await endpoint.getReceiveLibraryTimeout(oft.oft_address, connection.to.eid)
    const defaultTimeout = await endpoint.getDefaultReceiveLibraryTimeout(connection.to.eid as EndpointId)

    // If current matches default, we should set the new value regardless
    const isUsingDefault = currentTimeout.expiry === defaultTimeout.expiry && currentTimeout.lib === defaultTimeout.lib

    if (currentTimeout.expiry === BigInt(connection.config.receiveLibraryTimeoutConfig.expiry) && !isUsingDefault) {
        printAlreadySet('Receive library timeout', connection)
        return null
    } else {
        let diffMessage = createDiffMessage(`receive library timeout`, connection)
        if (isUsingDefault) {
            diffMessage += ' (currently set to defaults)'
        }

        diffPrinter(
            diffMessage,
            { timeout: currentTimeout.expiry },
            { timeout: connection.config.receiveLibraryTimeoutConfig.expiry }
        )

        const tx = oft.setReceiveLibraryTimeoutPayload(
            connection.to.eid,
            connection.config.receiveLibraryTimeoutConfig.lib,
            Number(connection.config.receiveLibraryTimeoutConfig.expiry)
        )
        return {
            payload: tx,
            description: buildTransactionDescription('Set Receive Library Timeout', connection),
            eid: connection.to.eid as EndpointId,
        }
    }
}

export async function createSetReceiveLibraryTx(
    oft: OFT,
    endpoint: Endpoint,
    connection: OAppOmniGraphHardhat['connections'][number]
): Promise<TransactionPayload | null> {
    if (!connection.config?.receiveLibraryConfig?.receiveLibrary) {
        printNotSet('Receive library', connection)
        return null
    }
    const currentReceiveLibrary = await endpoint.getReceiveLibrary(oft.oft_address, connection.to.eid)
    const currentReceiveLibraryAddress = currentReceiveLibrary[0]
    const isFallbackToDefault = currentReceiveLibrary[1]

    // if unset, fallbackToDefault will be true and the receive library should be set regardless of the current value
    if (
        currentReceiveLibraryAddress === connection.config.receiveLibraryConfig.receiveLibrary &&
        !isFallbackToDefault
    ) {
        printAlreadySet('Receive library', connection)
        return null
    } else {
        let diffMessage = createDiffMessage('receive library', connection)
        if (isFallbackToDefault) {
            diffMessage += ' (currently set to defaults)'
        }
        diffPrinter(
            diffMessage,
            { address: currentReceiveLibraryAddress },
            { address: connection.config.receiveLibraryConfig.receiveLibrary }
        )
        const tx = await oft.setReceiveLibraryPayload(
            connection.to.eid,
            connection.config.receiveLibraryConfig.receiveLibrary,
            Number(connection.config.receiveLibraryConfig.gracePeriod || 0)
        )
        return {
            payload: tx,
            description: buildTransactionDescription('Set Receive Library', connection),
            eid: connection.to.eid as EndpointId,
        }
    }
}

export async function createSetSendLibraryTx(
    oft: OFT,
    endpoint: Endpoint,
    connection: OAppOmniGraphHardhat['connections'][number]
) {
    if (!connection.config?.sendLibrary) {
        printNotSet('Send library', connection)
        return null
    }
    const currentSendLibrary = await endpoint.getSendLibrary(oft.oft_address, connection.to.eid)
    const currentSendLibraryAddress = currentSendLibrary[0]
    const isFallbackToDefault = currentSendLibrary[1]

    // if unset, fallbackToDefault will be true and the receive library should be set regardless of the current value
    if (currentSendLibraryAddress === connection.config.sendLibrary && !isFallbackToDefault) {
        printAlreadySet('Send library', connection)
        return null
    } else {
        let diffMessage = createDiffMessage('send library', connection)
        if (isFallbackToDefault) {
            diffMessage += ' (currently set to defaults)'
        }
        diffPrinter(diffMessage, { address: currentSendLibraryAddress }, { address: connection.config.sendLibrary })
        const tx = oft.setSendLibraryPayload(connection.to.eid, connection.config.sendLibrary)
        return {
            payload: tx,
            description: buildTransactionDescription('Set Send Library', connection),
            eid: connection.to.eid as EndpointId,
        }
    }
}

export async function createSetSendConfigTx(
    oft: OFT,
    endpoint: Endpoint,
    connection: OAppOmniGraphHardhat['connections'][number]
): Promise<TransactionPayload | null> {
    if (!connection.config?.sendConfig) {
        printNotSet('Send config', connection)
        return null
    }
    if (!connection.config.sendConfig.ulnConfig) {
        printNotSet('Send config', connection)
        return null
    }
    const newUlnConfig = createSerializableUlnConfig(
        connection.config.sendConfig.ulnConfig,
        connection.to,
        connection.from
    )

    const currentSendLibrary = await endpoint.getSendLibrary(oft.oft_address, connection.to.eid)
    const currentSendLibraryAddress = currentSendLibrary[0]

    const msgLib = new MsgLib(oft.moveVMConnection, currentSendLibraryAddress)
    const defaultUlnConfig = await msgLib.get_default_uln_send_config(connection.to.eid as EndpointId)
    const newSettingEqualsDefault = checkUlnConfigEqualsDefault(newUlnConfig, defaultUlnConfig)

    const currHexSerializedUlnConfig = await endpoint.getConfig(
        oft.oft_address,
        currentSendLibraryAddress,
        connection.to.eid as EndpointId,
        ConfigType.SEND_ULN
    )
    const currUlnConfig = UlnConfig.deserialize(currHexSerializedUlnConfig)

    await checkNewConfig(
        new MsgLib(oft.moveVMConnection, currentSendLibraryAddress),
        newUlnConfig,
        connection,
        ConfigType.SEND_ULN
    )

    const serializedCurrentConfig = UlnConfig.serialize(currUlnConfig)
    const newSerializedUlnConfig = UlnConfig.serialize(newUlnConfig)

    if (Buffer.from(serializedCurrentConfig).equals(Buffer.from(newSerializedUlnConfig)) && !newSettingEqualsDefault) {
        printAlreadySet('Send config', connection)
        return null
    } else {
        let diffMessage = createDiffMessage('send config', connection)
        // Add a note if the current config is set to defaults
        const currSettingEqualsDefault = checkUlnConfigEqualsDefault(currUlnConfig, defaultUlnConfig)
        if (currSettingEqualsDefault) {
            diffMessage += ' (currently set to defaults)'
        }

        diffPrinter(diffMessage, currUlnConfig, newUlnConfig)

        const sendLibAddress = connection.config?.sendLibrary ?? currentSendLibraryAddress

        const tx = oft.setConfigPayload(sendLibAddress, connection.to.eid, ConfigType.SEND_ULN, newSerializedUlnConfig)
        return {
            payload: tx,
            description: buildTransactionDescription('Set Send Config', connection),
            eid: connection.to.eid as EndpointId,
        }
    }
}

function checkUlnConfigEqualsDefault(ulnConfig: UlnConfig, defaultUlnConfig: UlnConfig): boolean {
    return (
        ulnConfig.confirmations === defaultUlnConfig.confirmations &&
        ulnConfig.optional_dvn_threshold === defaultUlnConfig.optional_dvn_threshold &&
        JSON.stringify(ulnConfig.optional_dvns.sort()) === JSON.stringify(defaultUlnConfig.optional_dvns.sort()) &&
        JSON.stringify(ulnConfig.required_dvns.sort()) === JSON.stringify(defaultUlnConfig.required_dvns.sort()) &&
        ulnConfig.use_default_for_confirmations === defaultUlnConfig.use_default_for_confirmations &&
        ulnConfig.use_default_for_required_dvns === defaultUlnConfig.use_default_for_required_dvns &&
        ulnConfig.use_default_for_optional_dvns === defaultUlnConfig.use_default_for_optional_dvns
    )
}

export async function createSetReceiveConfigTx(
    oft: OFT,
    endpoint: Endpoint,
    connection: OAppOmniGraphHardhat['connections'][number]
): Promise<TransactionPayload | null> {
    if (!connection.config?.receiveConfig) {
        printNotSet('Receive config', connection)
        return null
    }
    if (!connection.config.receiveConfig.ulnConfig) {
        printNotSet('Receive ULN config', connection)
        return null
    }
    const newUlnConfig = createSerializableUlnConfig(
        connection.config.receiveConfig.ulnConfig,
        connection.to,
        connection.from
    )

    const currentReceiveLibrary = await endpoint.getReceiveLibrary(oft.oft_address, connection.to.eid)
    const currentReceiveLibraryAddress = currentReceiveLibrary[0]

    const msgLib = new MsgLib(oft.moveVMConnection, currentReceiveLibraryAddress)
    const defaultUlnConfig = await msgLib.get_default_uln_receive_config(connection.to.eid as EndpointId)
    const newSettingEqualsDefault = checkUlnConfigEqualsDefault(newUlnConfig, defaultUlnConfig)

    const currHexSerializedUlnConfig = await endpoint.getConfig(
        oft.oft_address,
        currentReceiveLibraryAddress,
        connection.to.eid as EndpointId,
        ConfigType.RECV_ULN
    )

    const currUlnConfig = UlnConfig.deserialize(currHexSerializedUlnConfig)

    await checkNewConfig(
        new MsgLib(oft.moveVMConnection, currentReceiveLibraryAddress),
        newUlnConfig,
        connection,
        ConfigType.RECV_ULN
    )

    const serializedCurrentConfig = UlnConfig.serialize(currUlnConfig)
    const newSerializedUlnConfig = UlnConfig.serialize(newUlnConfig)

    if (Buffer.from(serializedCurrentConfig).equals(Buffer.from(newSerializedUlnConfig)) && !newSettingEqualsDefault) {
        printAlreadySet('Receive config', connection)
        return null
    } else {
        let diffMessage = createDiffMessage('receive config', connection)
        // Add a note if the current config is set to defaults
        const currSettingEqualsDefault = checkUlnConfigEqualsDefault(currUlnConfig, defaultUlnConfig)
        if (currSettingEqualsDefault) {
            diffMessage += ' (currently set to defaults)'
        }

        diffPrinter(diffMessage, currUlnConfig, newUlnConfig)

        const receiveLibAddress =
            connection.config?.receiveLibraryConfig?.receiveLibrary ?? currentReceiveLibraryAddress

        const tx = oft.setConfigPayload(
            receiveLibAddress,
            connection.to.eid,
            ConfigType.RECV_ULN,
            newSerializedUlnConfig
        )
        return {
            payload: tx,
            description: buildTransactionDescription('Set Receive Config', connection),
            eid: connection.to.eid as EndpointId,
        }
    }
}

export async function checkExecutorConfigEqualsDefault(
    msgLib: MsgLib,
    newExecutorConfig: ExecutorConfig,
    eid: EndpointId
): Promise<boolean> {
    const defaultExecutorConfig = await msgLib.get_default_executor_config(eid)
    return (
        newExecutorConfig.executor_address === defaultExecutorConfig.executor_address &&
        newExecutorConfig.max_message_size === defaultExecutorConfig.max_message_size
    )
}

export async function createSetExecutorConfigTx(
    oft: OFT,
    endpoint: Endpoint,
    connection: OAppOmniGraphHardhat['connections'][number]
): Promise<TransactionPayload | null> {
    if (!connection.config?.sendConfig?.executorConfig) {
        printNotSet('Executor config', connection)
        return null
    }
    const newExecutorConfig = createSerializableExecutorConfig(connection.config.sendConfig.executorConfig)
    const currentSendLibrary = await endpoint.getSendLibrary(oft.oft_address, connection.to.eid)
    const currentSendLibraryAddress = currentSendLibrary[0]

    const currHexSerializedExecutorConfig = await endpoint.getConfig(
        oft.oft_address,
        currentSendLibraryAddress,
        connection.to.eid as EndpointId,
        ConfigType.EXECUTOR
    )

    const msgLib = new MsgLib(oft.moveVMConnection, currentSendLibraryAddress)
    const newSettingEqualsDefault = await checkExecutorConfigEqualsDefault(
        msgLib,
        newExecutorConfig,
        connection.to.eid as EndpointId
    )

    const currExecutorConfig = ExecutorConfig.deserialize(currHexSerializedExecutorConfig)
    currExecutorConfig.executor_address = '0x' + currExecutorConfig.executor_address
    // We need to re-serialize the current config to compare it with the new config to ensure same format
    const serializedCurrentConfig = ExecutorConfig.serialize(currExecutorConfig)

    const newSerializedExecutorConfig = ExecutorConfig.serialize(newExecutorConfig)

    if (
        Buffer.from(serializedCurrentConfig).equals(Buffer.from(newSerializedExecutorConfig)) &&
        !newSettingEqualsDefault
    ) {
        printAlreadySet('Executor config', connection)
        return null
    } else {
        let diffMessage = createDiffMessage('executor config', connection)
        // Add a note if the current config is set to defaults
        const currSettingEqualsDefault = await checkExecutorConfigEqualsDefault(
            msgLib,
            currExecutorConfig,
            connection.to.eid as EndpointId
        )
        if (currSettingEqualsDefault) {
            diffMessage += ' (currently set to defaults)'
        }

        diffPrinter(diffMessage, currExecutorConfig, newExecutorConfig)

        const sendLibrary = connection.config.sendLibrary ?? currentSendLibraryAddress

        const tx = oft.setConfigPayload(
            sendLibrary,
            connection.to.eid,
            ConfigType.EXECUTOR,
            newSerializedExecutorConfig
        )
        return {
            payload: tx,
            description: buildTransactionDescription('setExecutorConfig', connection),
            eid: connection.to.eid as EndpointId,
        }
    }
}

export async function createSetRateLimitTx(
    oft: OFT,
    rateLimit: bigint,
    window_seconds: bigint,
    eid: EndpointId,
    oftType: OFTType
): Promise<TransactionPayload | null> {
    const [currentLimit, currentWindow] = await oft.getRateLimitConfig(eid, oftType)
    const toNetwork = getNetworkForChainId(eid)

    if (currentLimit === rateLimit && currentWindow === window_seconds) {
        console.log(`✅ Rate limit already set for ${toNetwork.chainName}-${toNetwork.env}`)
        return null
    } else {
        diffPrinter(
            `Set rate limit for ${toNetwork.chainName}-${toNetwork.env}`,
            { limit: currentLimit, window: currentWindow },
            { limit: rateLimit, window: window_seconds }
        )

        const tx = oft.createSetRateLimitTx(eid, rateLimit, window_seconds, oftType)
        return {
            payload: tx,
            description: `Set rate limit for ${toNetwork.chainName}-${toNetwork.env}`,
            eid: eid,
        }
    }
}

export async function createUnsetRateLimitTx(
    oft: OFT,
    eid: EndpointId,
    oftType: OFTType
): Promise<TransactionPayload | null> {
    const tx = oft.createUnsetRateLimitTx(eid, oftType)
    const toNetwork = getNetworkForChainId(eid)
    return {
        payload: tx,
        description: `Unset rate limit for ${toNetwork.chainName}-${toNetwork.env}`,
        eid: eid,
    }
}

export async function createSetFeeBpsTx(
    oft: OFT,
    fee_bps: bigint,
    eid: EndpointId,
    oftType: OFTType
): Promise<TransactionPayload | null> {
    const currentFeeBps = await oft.getFeeBps(oftType)
    const toNetwork = getNetworkForChainId(eid)

    if (currentFeeBps === fee_bps) {
        console.log(`✅ Fee BPS already set for ${toNetwork.chainName}-${toNetwork.env}`)
        return null
    } else {
        diffPrinter(
            `Set fee BPS for ${toNetwork.chainName}-${toNetwork.env}`,
            { fee_bps: currentFeeBps },
            { fee_bps: fee_bps }
        )

        const tx = oft.createSetFeeBpsTx(fee_bps, oftType)
        return {
            payload: tx,
            description: `Set fee BPS for ${toNetwork.chainName}-${toNetwork.env}`,
            eid: eid,
        }
    }
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

export async function createSetEnforcedOptionsTxs(
    oft: OFT,
    connection: OAppOmniGraphHardhat['connections'][number]
): Promise<TransactionPayload[]> {
    const txs: TransactionPayload[] = []
    if (!connection.config?.enforcedOptions) {
        printNotSet('Enforced options', connection)
        return []
    }

    const msgTypes = [1, 2]
    for (const msgType of msgTypes) {
        const options = getOptionsByMsgType(connection, msgType)
        const tx = await createTxFromOptions(options, connection, oft, msgType)
        if (tx) {
            txs.push({
                payload: tx,
                description: buildTransactionDescription('Set Enforced Options', connection),
                eid: connection.to.eid as EndpointId,
            })
        }
    }
    return txs
}

function getOptionsByMsgType(entry: OAppOmniGraphHardhat['connections'][number], msgType: number): any[] {
    const options = []
    for (const enforcedOption of entry.config?.enforcedOptions ?? []) {
        if (enforcedOption.msgType === msgType) {
            options.push(enforcedOption)
        }
    }
    return options
}

async function createTxFromOptions(
    options: Options[],
    entry: OAppOmniGraphHardhat['connections'][number],
    oft: OFT,
    msgType: number
): Promise<TypedInputGenerateTransactionPayloadData | null> {
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
        const defaultReceiveConfig = await msgLib.get_default_uln_receive_config(entry.to.eid as EndpointId)
        const defaultConfirmations = defaultReceiveConfig.confirmations
        if (newUlnConfig.confirmations < defaultConfirmations) {
            console.log(createWarningMessage(configType, entry))
            console.log(
                `\tConfig has less than ${defaultConfirmations} block confirmations.\n\tWe recommend setting at least ${defaultConfirmations} block confirmations.\n`
            )
        }
    } else if (configType === ConfigType.SEND_ULN) {
        const defaultSendConfig = await msgLib.get_default_uln_send_config(entry.to.eid as EndpointId)
        const defaultConfirmations = defaultSendConfig.confirmations
        if (newUlnConfig.confirmations < defaultConfirmations) {
            console.log(createWarningMessage(configType, entry))
            console.log(
                `\tConfig has less than ${defaultConfirmations} block confirmations.\n\tWe recommend setting at least ${defaultConfirmations} block confirmations.\n`
            )
        }
    }
}

export function createIrrevocablyDisableBlocklistPayload(oft: OFT, oftType: OFTType): TransactionPayload {
    const payload = oft.irrevocablyDisableBlocklistPayload(oftType)
    return {
        payload: payload,
        description: `Irrevocably Disable Blocklist`,
    }
}

export function createPermanentlyDisableFungibleStoreFreezingPayload(oft: OFT): TransactionPayload {
    const payload = oft.permanentlyDisableFungibleStoreFreezingPayload()
    return {
        payload: payload,
        description: `Permanently Disable Freezing`,
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
    return `Set ${elementDesc} for pathway ${entry.from.contractName} on ${fromNetwork.chainName}-${fromNetwork.env} → ${toNetwork.chainName}-${toNetwork.env}`
}

function printAlreadySet(configObject: string, entry: OAppOmniGraphHardhat['connections'][number]) {
    const toNetwork = getNetworkForChainId(entry.to.eid)
    const fromNetwork = getNetworkForChainId(entry.from.eid)
    console.log(
        `✅ ${configObject} already set or pathway ${fromNetwork.chainName}-${fromNetwork.env} → ${toNetwork.chainName}-${toNetwork.env}\n`
    )
}

function printNotSet(configObject: string, entry: OAppOmniGraphHardhat['connections'][number]) {
    const toNetwork = getNetworkForChainId(entry.to.eid)
    const fromNetwork = getNetworkForChainId(entry.from.eid)
    console.log(
        `No ${configObject} specified for pathway ${fromNetwork.chainName}-${fromNetwork.env} → ${toNetwork.chainName}-${toNetwork.env}\n`
    )
}

function createWarningMessage(configType: ConfigType, entry: OAppOmniGraphHardhat['connections'][number]) {
    const fromNetwork = getNetworkForChainId(entry.from.eid)
    const toNetwork = getNetworkForChainId(entry.to.eid)
    return `⚠️ WARN: ${configTypeToNameMap[configType]} config for ${fromNetwork.chainName}-${fromNetwork.env} → ${toNetwork.chainName}-${toNetwork.env}`
}

function buildTransactionDescription(action: string, connections: OAppOmniGraphHardhat['connections'][number]): string {
    const fromNetwork = getNetworkForChainId(connections.from.eid)
    const toNetwork = getNetworkForChainId(connections.to.eid)

    return `${action} from ${fromNetwork.chainName}-${fromNetwork.env} → ${toNetwork.chainName}-${toNetwork.env}`
}
