import { OFT } from '../../sdk/oft'
import * as fs from 'fs'
import * as path from 'path'
import type { OAppOmniGraphHardhat } from '@layerzerolabs/toolbox-hardhat'
import { createEidToNetworkMapping, diffPrinter } from './utils'
import { ExecutorOptionType, Options } from '@layerzerolabs/lz-v2-utilities-v3'
import { UlnConfig } from '.'
import { EndpointId } from '@layerzerolabs/lz-definitions-v3'
import { createSerializableUlnConfig } from './ulnConfigBuilder'
import { hexToAptosBytesAddress } from '../../sdk/utils'

export function toAptosAddress(address: string): string {
    if (!address) {
        return '0x' + '0'.repeat(64)
    }
    const hex = address.replace('0x', '')
    return '0x' + hex.padStart(64, '0')
}

export async function setPeers(oft: OFT, connections: OAppOmniGraphHardhat['connections']) {
    const eidToNetworkMapping = createEidToNetworkMapping()
    const txs = []

    for (const entry of connections) {
        const networkName = eidToNetworkMapping[entry.to.eid]
        const newPeer = toAptosAddress(getContractAddress(networkName, entry.to.contractName))
        const currentPeerBytes = await oft.getPeer(entry.to.eid as EndpointId)
        const currentPeerHex = '0x' + Buffer.from(currentPeerBytes as Uint8Array).toString('hex')

        console.log(`currentPeer: ${currentPeerHex} currentPeerHexType: ${typeof currentPeerHex}`)
        console.log(`contractAddress: ${newPeer} contractAddressType: ${typeof newPeer}`)
        if (currentPeerHex === newPeer) {
            // TODO integrate shankars diff display
            console.log(`Peer already set for ${networkName} (${entry.to.eid}) -> ${newPeer} ✓\n`)
        } else {
            console.log(`currentPeerHex: ${currentPeerHex} currentPeerHexType: ${typeof currentPeerHex}`)
            console.log(`contractAddress: ${newPeer} contractAddressType: ${typeof newPeer}`)

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
    for (const entry of connections) {
        if (!entry.config?.enforcedOptions) {
            console.log(`No enforced options specified for contract ${entry.to.contractName} on eid ${entry.to.eid}\n`)
            continue
        }
        for (const enforcedOption of entry.config.enforcedOptions) {
            const newOptions = createOptions(enforcedOption)

            const currentOptionsHex = await oft.getEnforcedOptions(entry.to.eid, enforcedOption.msgType)

            if (newOptions.toHex() === currentOptionsHex) {
                console.log(`Enforced options already set for ${entry.to.contractName} on eid ${entry.to.eid} ✓\n`)
                continue
            } else {
                const currentOptions = Options.fromOptions(currentOptionsHex)
                diffPrinter(
                    `Set enforced options for ${entry.to.contractName} on eid ${entry.to.eid}`,
                    currentOptions,
                    enforcedOption
                )
                const tx = await oft.setEnforcedOptionsPayload(
                    entry.to.eid,
                    enforcedOption.msgType,
                    newOptions.toBytes()
                )
                txs.push(tx)
            }
        }
    }

    return txs

    function createOptions(enforcedOption) {
        const options = Options.newOptions()
        //TODO: Accept all option types
        if (enforcedOption.optionType === ExecutorOptionType.LZ_RECEIVE) {
            options.addExecutorLzReceiveOption(enforcedOption.gas, enforcedOption.value)
        } else if (enforcedOption.optionType === ExecutorOptionType.NATIVE_DROP) {
            options.addExecutorNativeDropOption(enforcedOption.amount, enforcedOption.receiver)
        }
        return options
    }
}

export async function setReceiveLibraryTimeout(oft: OFT, connections: OAppOmniGraphHardhat['connections']) {
    const txs = []
    for (const entry of connections) {
        if (!entry.config?.receiveLibraryTimeoutConfig) {
            console.log(
                `No receive library timeout specified for contract ${entry.to.contractName} on eid ${entry.to.eid}\n`
            )
            continue
        }
        const tx = await oft.setReceiveLibraryTimeoutPayload(
            entry.to.eid,
            entry.config.receiveLibraryTimeoutConfig.lib,
            Number(entry.config.receiveLibraryTimeoutConfig.expiry)
        )
        txs.push(tx)
    }

    return txs
}

export async function setReceiveLibrary(oft: OFT, connections: OAppOmniGraphHardhat['connections']) {
    const txs = []
    for (const entry of connections) {
        if (!entry.config?.receiveLibraryConfig?.receiveLibrary) {
            console.log(`No receive library specified for contract ${entry.to.contractName} on eid ${entry.to.eid}\n`)
            continue
        }
        const tx = await oft.setReceiveLibraryPayload(
            entry.to.eid,
            entry.config.receiveLibraryConfig.receiveLibrary,
            Number(entry.config.receiveLibraryConfig.gracePeriod || 0)
        )
        txs.push(tx)
    }

    return txs
}

export async function setSendLibrary(oft: OFT, connections: OAppOmniGraphHardhat['connections']) {
    const txs = []
    for (const entry of connections) {
        if (!entry.config?.sendLibrary) {
            console.log(`No send library specified for contract ${entry.to.contractName} on eid ${entry.to.eid}\n`)
            continue
        }
        console.log(
            `Setting send library for contract ${entry.to.contractName} on eid ${entry.to.eid} to ${entry.config.sendLibrary}\n`
        )

        const tx = await oft.setSendLibraryPayload(entry.to.eid, entry.config.sendLibrary)
        txs.push(tx)
    }

    return txs
}

export async function setSendConfig(oft: OFT, connections: OAppOmniGraphHardhat['connections']) {
    const txs = []
    for (const entry of connections) {
        if (!entry.config?.sendConfig) {
            console.log(`No send config specified for contract ${entry.to.contractName} on eid ${entry.to.eid}\n`)
            continue
        }

        if (entry.config.sendConfig.ulnConfig) {
            const serializableUlnConfig = createSerializableUlnConfig(
                entry.config.sendConfig.ulnConfig,
                entry.to,
                entry.from
            )

            const serializedUlnConfig = UlnConfig.serialize(entry.to.eid as EndpointId, serializableUlnConfig)

            const tx = await oft.setConfigPayload(entry.config.sendLibrary, 2, serializedUlnConfig)
            txs.push(tx)
        }
    }

    return txs
}

export async function setReceiveConfig(oft: OFT, connections: OAppOmniGraphHardhat['connections']) {
    const txs = []
    for (const entry of connections) {
        if (!entry.config?.receiveConfig) {
            console.log(`No receive config specified for contract ${entry.to.contractName} on eid ${entry.to.eid}\n`)
            continue
        }

        if (entry.config.receiveConfig.ulnConfig) {
            const serializableUlnConfig = createSerializableUlnConfig(
                entry.config.receiveConfig.ulnConfig,
                entry.to,
                entry.from
            )
            const serializedUlnConfig = UlnConfig.serialize(entry.to.eid as EndpointId, serializableUlnConfig)

            const tx = await oft.setConfigPayload(
                entry.config.receiveLibraryConfig.receiveLibrary,
                2,
                serializedUlnConfig
            )
            txs.push(tx)
        }
    }

    return txs
}
