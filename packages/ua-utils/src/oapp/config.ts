import { Address, flattenTransactions, type OmniTransaction } from '@layerzerolabs/utils'
import type { OAppFactory, OAppOmniGraph } from './types'
import { createModuleLogger, printBoolean } from '@layerzerolabs/io-utils'
import { formatOmniVector } from '@layerzerolabs/utils'
import {
    CONFIG_TYPE_EXECUTOR,
    CONFIG_TYPE_ULN,
    Uln302ExecutorConfig,
    Uln302UlnConfig,
} from '@layerzerolabs/protocol-utils'
import { SetConfigParam } from '@layerzerolabs/protocol-utils'
import { defaultAbiCoder } from '@ethersproject/abi'

export type OAppConfigurator = (graph: OAppOmniGraph, createSdk: OAppFactory) => Promise<OmniTransaction[]>

export const configureOApp: OAppConfigurator = async (graph: OAppOmniGraph, createSdk: OAppFactory) =>
    flattenTransactions([await configureOAppPeers(graph, createSdk), await configureOAppConfigs(graph, createSdk)])

export const configureOAppPeers: OAppConfigurator = async (graph, createSdk) => {
    const logger = createModuleLogger('OApp')
    const setPeers = await Promise.all(
        graph.connections.map(async ({ vector: { from, to } }): Promise<OmniTransaction[]> => {
            logger.verbose(`Checking connection ${formatOmniVector({ from, to })}`)

            const sdk = await createSdk(from)
            const hasPeer = await sdk.hasPeer(to.eid, to.address)

            logger.verbose(`Checked connection ${formatOmniVector({ from, to })}: ${printBoolean(hasPeer)}`)
            if (hasPeer) return []

            logger.verbose(`Creating a connection ${formatOmniVector({ from, to })}`)
            return [await sdk.setPeer(to.eid, to.address)]
        })
    )

    return [...setPeers].flat()
}

export const configureOAppConfigs: OAppConfigurator = async (graph, createSdk) => {
    const setSendLibrary = await Promise.all(
        graph.connections.map(async ({ vector: { from, to }, config }): Promise<OmniTransaction[]> => {
            if (!config?.sendLibrary) return []
            const oappSdk = await createSdk(from)
            const endpointSdk = await oappSdk.getEndpointSDK()
            const currentSendLibrary = await endpointSdk.getSendLibrary(from.address, to.eid)

            if (currentSendLibrary === config.sendLibrary) return []
            return [await endpointSdk.setSendLibrary(to.eid, config.sendLibrary)]
        })
    )

    const setReceiveLibrary = await Promise.all(
        graph.connections.map(async ({ vector: { from, to }, config }): Promise<OmniTransaction[]> => {
            if (!config?.receiveLibraryConfig) return []
            const oappSdk = await createSdk(from)
            const endpointSdk = await oappSdk.getEndpointSDK()
            const [currentReceiveLibrary] = await endpointSdk.getReceiveLibrary(from.address, to.eid)

            if (currentReceiveLibrary === config.receiveLibraryConfig.receiveLibrary) return []
            return [
                await endpointSdk.setReceiveLibrary(
                    to.eid,
                    config.receiveLibraryConfig.receiveLibrary,
                    config.receiveLibraryConfig.gracePeriod
                ),
            ]
        })
    )

    const setReceiveLibraryTimeout = await Promise.all(
        graph.connections.map(async ({ vector: { from, to }, config }): Promise<OmniTransaction[]> => {
            if (!config?.receiveLibraryTimeoutConfig) return []
            const oappSdk = await createSdk(from)
            const endpointSdk = await oappSdk.getEndpointSDK()
            const timeout = await endpointSdk.getReceiveLibraryTimeout(from.address, to.eid)

            if (
                timeout.lib === config.receiveLibraryTimeoutConfig.lib &&
                timeout.expiry === config.receiveLibraryTimeoutConfig.expiry
            )
                return []
            return [
                await endpointSdk.setReceiveLibraryTimeout(
                    to.eid,
                    config.receiveLibraryTimeoutConfig.lib,
                    config.receiveLibraryTimeoutConfig.expiry
                ),
            ]
        })
    )

    const setConfg = await Promise.all(
        graph.connections.map(async ({ vector: { from, to }, config }): Promise<OmniTransaction[]> => {
            const oappSdk = await createSdk(from)
            const endpointSdk = await oappSdk.getEndpointSDK()
            const sendConfigs: SetConfigParam[] = []
            const receiveConfigs: SetConfigParam[] = []
            const transactions: OmniTransaction[] = []

            if (config?.sendConfig) {
                const currentSendLibrary: Address = config.sendLibrary
                    ? config.sendLibrary
                    : (await endpointSdk.getSendLibrary(from.address, to.eid)) ?? ''
                const sendExecutorConfig: Uln302ExecutorConfig = <Uln302ExecutorConfig>(
                    await endpointSdk.getConfig(from.address, currentSendLibrary, to.eid, CONFIG_TYPE_EXECUTOR)
                )

                const setExecutorConfigParam: SetConfigParam = {
                    eid: to.eid,
                    configType: CONFIG_TYPE_EXECUTOR,
                    config: '',
                }

                // 1) executor
                // - maxMessageSize
                // - executor
                if (
                    sendExecutorConfig.maxMessageSize !== config.sendConfig.executorConfig.maxMessageSize ||
                    sendExecutorConfig.executor !== config.sendConfig.executorConfig.executor
                ) {
                    setExecutorConfigParam.config = defaultAbiCoder.encode(
                        ['uint32', 'address'],
                        [config.sendConfig.executorConfig.maxMessageSize, config.sendConfig.executorConfig.executor]
                    )
                    sendConfigs.push(setExecutorConfigParam)
                }

                const setUlnConfigParam: SetConfigParam = {
                    eid: to.eid,
                    configType: CONFIG_TYPE_ULN,
                    config: '',
                }

                // 2) uln
                // - confirmations
                // - optionalDVNThreshold
                // - requiredDVNs
                // - optionalDVNs
                const sendUlnConfig = <Uln302UlnConfig>(
                    await endpointSdk.getConfig(from.address, currentSendLibrary, to.eid, CONFIG_TYPE_ULN)
                )
                if (
                    sendUlnConfig.confirmations !== config.sendConfig.ulnConfig.confirmations ||
                    sendUlnConfig.optionalDVNThreshold !== config.sendConfig.ulnConfig.optionalDVNThreshold ||
                    sendUlnConfig.requiredDVNs !== config.sendConfig.ulnConfig.requiredDVNs ||
                    sendUlnConfig.optionalDVNs !== config.sendConfig.ulnConfig.optionalDVNs
                ) {
                    setUlnConfigParam.config = defaultAbiCoder.encode(
                        ['uint64', 'uint8', 'uint8', 'uint8', 'address[]', 'address[]'],
                        [
                            config.sendConfig.ulnConfig.confirmations,
                            config.sendConfig.ulnConfig.requiredDVNs.length,
                            config.sendConfig.ulnConfig.optionalDVNs.length,
                            config.sendConfig.ulnConfig.optionalDVNThreshold,
                            config.sendConfig.ulnConfig.requiredDVNs,
                            config.sendConfig.ulnConfig.optionalDVNs,
                        ]
                    )
                    sendConfigs.push(setUlnConfigParam)
                }

                if (sendConfigs.length) transactions.push(await endpointSdk.setConfig(currentSendLibrary, sendConfigs))
            }

            if (config?.receiveConfig) {
                const setUlnConfigParam: SetConfigParam = {
                    eid: to.eid,
                    configType: CONFIG_TYPE_ULN,
                    config: '',
                }
                const [currentReceiveLibrary] = config.receiveLibraryConfig?.receiveLibrary
                    ? [config.receiveLibraryConfig?.receiveLibrary, false]
                    : await endpointSdk.getReceiveLibrary(from.address, to.eid)
                const receiveUlnConfig: Uln302UlnConfig = <Uln302UlnConfig>(
                    await endpointSdk.getConfig(from.address, currentReceiveLibrary!, to.eid, CONFIG_TYPE_ULN)
                )
                if (
                    receiveUlnConfig.confirmations !== config.receiveConfig.ulnConfig.confirmations ||
                    receiveUlnConfig.optionalDVNThreshold !== config.receiveConfig.ulnConfig.optionalDVNThreshold ||
                    receiveUlnConfig.requiredDVNs !== config.receiveConfig.ulnConfig.requiredDVNs ||
                    receiveUlnConfig.optionalDVNs !== config.receiveConfig.ulnConfig.optionalDVNs
                ) {
                    setUlnConfigParam.config = defaultAbiCoder.encode(
                        ['uint64', 'uint8', 'uint8', 'uint8', 'address[]', 'address[]'],
                        [
                            config.receiveConfig.ulnConfig.confirmations,
                            config.receiveConfig.ulnConfig.requiredDVNs.length,
                            config.receiveConfig.ulnConfig.optionalDVNs.length,
                            config.receiveConfig.ulnConfig.optionalDVNThreshold,
                            config.receiveConfig.ulnConfig.requiredDVNs,
                            config.receiveConfig.ulnConfig.optionalDVNs,
                        ]
                    )
                    receiveConfigs.push(setUlnConfigParam)
                }
                if (receiveConfigs.length)
                    transactions.push(await endpointSdk.setConfig(currentReceiveLibrary!, receiveConfigs))
            }

            if (!sendConfigs.length && !receiveConfigs.length) return []
            return [...transactions]
        })
    )

    return [...setSendLibrary, ...setReceiveLibrary, ...setReceiveLibraryTimeout, ...setConfg].flat()
}
