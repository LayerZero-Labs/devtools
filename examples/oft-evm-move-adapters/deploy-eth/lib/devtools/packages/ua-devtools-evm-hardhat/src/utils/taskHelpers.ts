import { formatOmniPoint, type OmniAddress } from '@layerzerolabs/devtools'
import type {
    IEndpointV2,
    Timeout,
    Uln302ExecutorConfig,
    Uln302UlnConfig,
    UlnReadUlnConfig,
} from '@layerzerolabs/protocol-devtools'
import { ChannelId, EndpointId } from '@layerzerolabs/lz-definitions'

export async function getSendConfig(
    endpointV2Sdk: IEndpointV2,
    eid: EndpointId,
    address?: OmniAddress,
    custom: boolean = false
): Promise<[OmniAddress, Uln302UlnConfig, Uln302ExecutorConfig] | undefined> {
    let sendLibrary
    let localSendUlnSDK
    /**
     * if custom is true then get the custom send uln config
     */
    if (custom) {
        if (address == null) {
            throw new Error(`Must pass in OApp address when custom param is set to true`)
        }
        const isDefault = await endpointV2Sdk.isDefaultSendLibrary(address, eid)
        /**
         * need to return sendLibrary == AddressZero when custom config is using default send library
         */
        sendLibrary = isDefault
            ? '0x0000000000000000000000000000000000000000'
            : await endpointV2Sdk.getSendLibrary(address, eid)
        if (sendLibrary == null) {
            throw new Error(`Custom Send Library not set from ${formatOmniPoint(endpointV2Sdk.point)} to ${eid}`)
        }
        /**
         * if using a custom send library use it to retrieve the custom ULN
         * else get the default send library and use it to retrieve the default ULN
         */
        if (!isDefault) {
            localSendUlnSDK = await endpointV2Sdk.getUln302SDK(sendLibrary)
        } else {
            const defaultSendLib = await endpointV2Sdk.getDefaultSendLibrary(eid)
            if (defaultSendLib == null) {
                throw new Error(`Default Send Library not set from ${formatOmniPoint(endpointV2Sdk.point)} to ${eid}`)
            }
            localSendUlnSDK = await endpointV2Sdk.getUln302SDK(defaultSendLib)
        }
    } else {
        /**
         * else if address is defined get the actual send uln config
         * else get the default send uln config
         */
        sendLibrary =
            address == null
                ? await endpointV2Sdk.getDefaultSendLibrary(eid)
                : await endpointV2Sdk.getSendLibrary(address, eid)
        if (sendLibrary == null) {
            throw new Error(`Default Send Library not set from ${formatOmniPoint(endpointV2Sdk.point)} to ${eid}`)
        }
        localSendUlnSDK = await endpointV2Sdk.getUln302SDK(sendLibrary)
    }

    /**
     * if custom is true then get the custom send uln config
     * else if address is defined get the actual send uln config
     * else get the default send uln config
     */
    const sendUlnConfig = custom
        ? await localSendUlnSDK.getAppUlnConfig(eid, address)
        : await localSendUlnSDK.getUlnConfig(eid, address)
    const sendExecutorConfig = custom
        ? await localSendUlnSDK.getAppExecutorConfig(eid, address)
        : await localSendUlnSDK.getExecutorConfig(eid, address)

    return [sendLibrary, sendUlnConfig, sendExecutorConfig]
}

export async function getReceiveConfig(
    endpointV2Sdk: IEndpointV2,
    eid: EndpointId,
    address?: OmniAddress,
    custom: boolean = false
): Promise<[OmniAddress, Uln302UlnConfig, Timeout] | undefined> {
    let receiveLibrary
    let localReceiveUlnSDK
    /**
     * if custom is true then get the custom receive uln config
     */
    if (custom) {
        if (address == null) {
            throw new Error(`Must pass in OApp address when custom param is set to true`)
        }
        /**
         * getReceiveLibrary returns a custom receive library if set else it returns the default retrieve library
         */
        const [receiveAppLibrary, isDefault] = await endpointV2Sdk.getReceiveLibrary(address, eid)
        /**
         * need to return receiveLibrary == AddressZero when custom config is using default receive library
         */
        receiveLibrary = isDefault ? '0x0000000000000000000000000000000000000000' : receiveAppLibrary
        if (receiveLibrary == null) {
            throw new Error(`Custom Receive Library not set from ${formatOmniPoint(endpointV2Sdk.point)} to ${eid}`)
        }
        if (receiveAppLibrary == null) {
            throw new Error(`Default Receive Library not set from ${formatOmniPoint(endpointV2Sdk.point)} to ${eid}`)
        }

        /**
         * use receiveAppLibrary from getReceiveLibrary return to get correct uln
         */
        localReceiveUlnSDK = await endpointV2Sdk.getUln302SDK(receiveAppLibrary)
    } else {
        /**
         * else if address is defined get the actual receive uln config
         * else get the default receive uln config
         */
        receiveLibrary =
            address == null
                ? await endpointV2Sdk.getDefaultReceiveLibrary(eid)
                : await endpointV2Sdk.getReceiveLibrary(address, eid).then(([address]) => address)
        if (receiveLibrary == null) {
            throw new Error(`Default Receive Library not set from ${formatOmniPoint(endpointV2Sdk.point)} to ${eid}`)
        }
        localReceiveUlnSDK = await endpointV2Sdk.getUln302SDK(receiveLibrary)
    }
    /**
     * if address is defined get the actual/custom send uln config
     * else get the default send uln config
     */
    const receiveLibraryTimeout =
        address != null
            ? await endpointV2Sdk.getReceiveLibraryTimeout(address, eid)
            : await endpointV2Sdk.getDefaultReceiveLibraryTimeout(eid)

    /**
     * if custom is true then get the custom receive uln config
     * else if address is defined get the actual send uln config
     * else get the default send uln config
     */
    const receiveUlnConfig = custom
        ? await localReceiveUlnSDK.getAppUlnConfig(eid, address)
        : await localReceiveUlnSDK.getUlnConfig(eid, address)

    return [receiveLibrary, receiveUlnConfig, receiveLibraryTimeout]
}

export async function getReadConfig(
    endpointV2Sdk: IEndpointV2,
    channelIds: number[] = [ChannelId.READ_CHANNEL_1],
    address?: OmniAddress,
    custom: boolean = false
): Promise<[OmniAddress, UlnReadUlnConfig, number][] | undefined> {
    const availableChannels = Object.keys(ChannelId)
        .filter((key) => !isNaN(Number(key)))
        .map((key) => Number(key))
        .sort((a, b) => b - a)

    if (channelIds.length > availableChannels.length) {
        throw new Error(`Number of channels requested exceeds the number of possible channels`)
    }

    for (const channel of channelIds) {
        if (!availableChannels.includes(channel)) {
            throw new Error(`Channel ${channel} is not available`)
        }
    }

    const sortedChannelIds = channelIds.sort((a, b) => b - a)

    const readConfigs: [OmniAddress, UlnReadUlnConfig, number][] = []

    for (const channelId of sortedChannelIds) {
        let readLibrary
        let localReadUlnSDK

        /**
         * if custom is true then get the custom send uln config
         */
        if (custom) {
            if (address == null) {
                throw new Error(`Must pass in OApp address when custom param is set to true`)
            }
            // Using sendLibrary of channelId to get the readLibrary
            const isDefault = await endpointV2Sdk.isDefaultSendLibrary(address, channelId)
            /**
             * need to return sendLibrary == AddressZero when custom config is using default send library
             */
            readLibrary = isDefault
                ? '0x0000000000000000000000000000000000000000'
                : await endpointV2Sdk.getSendLibrary(address, channelId)
            if (readLibrary == null) {
                throw new Error(
                    `Custom Send Library not set from ${formatOmniPoint(endpointV2Sdk.point)} to ${channelId}`
                )
            }
            /**
             * if using a custom send library use it to retrieve the custom ULN
             * else get the default send library and use it to retrieve the default ULN
             */
            if (!isDefault) {
                localReadUlnSDK = await endpointV2Sdk.getUlnReadSDK(readLibrary)
            } else {
                const defaultSendLib = await endpointV2Sdk.getDefaultSendLibrary(channelId)
                if (defaultSendLib == null) {
                    throw new Error(
                        `Default Send Library not set from ${formatOmniPoint(endpointV2Sdk.point)} to ${channelId}`
                    )
                }
                localReadUlnSDK = await endpointV2Sdk.getUlnReadSDK(defaultSendLib)
            }
        } else {
            /**
             * else if address is defined get the actual send uln config
             * else get the default send uln config
             */
            readLibrary =
                address == null
                    ? await endpointV2Sdk.getDefaultSendLibrary(channelId)
                    : await endpointV2Sdk.getSendLibrary(address, channelId)
            if (readLibrary == null) {
                throw new Error(
                    `Default Send Library not set from ${formatOmniPoint(endpointV2Sdk.point)} to ${channelId}`
                )
            }
            localReadUlnSDK = await endpointV2Sdk.getUlnReadSDK(readLibrary)
        }

        /**
         * if custom is true then get the custom send uln config
         * else if address is defined get the actual send uln config
         * else get the default send uln config
         */
        const readUlnConfig = custom
            ? await localReadUlnSDK.getAppUlnConfig(channelId, address)
            : await localReadUlnSDK.getUlnConfig(channelId, address)

        readConfigs.push([readLibrary, readUlnConfig, channelId])
    }

    return readConfigs
}
