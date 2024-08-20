import type { OmniAddress } from '@layerzerolabs/devtools'
import type {
    ExecutorDstConfig,
    Timeout,
    Uln302ExecutorConfig,
    Uln302UlnConfig,
} from '@layerzerolabs/protocol-devtools'
import {
    createContractFactory,
    createOmniPointHardhatTransformer,
    createProviderFactory,
    getEidForNetworkName,
} from '@layerzerolabs/devtools-evm-hardhat'
import { createEndpointV2Factory, createExecutorFactory } from '@layerzerolabs/protocol-devtools-evm'

export async function getSendConfig(
    localNetworkName: string,
    remoteNetworkName: string,
    address?: OmniAddress,
    custom: boolean = false
): Promise<[OmniAddress, Uln302UlnConfig, Uln302ExecutorConfig] | undefined> {
    const localEid = getEidForNetworkName(localNetworkName)
    const remoteEid = getEidForNetworkName(remoteNetworkName)
    const providerFactory = createProviderFactory()
    const pointTransformer = createOmniPointHardhatTransformer()
    const EndpointV2Factory = createEndpointV2Factory(providerFactory)

    const localEndpointSDK = await EndpointV2Factory(
        await pointTransformer({ eid: localEid, contractName: 'EndpointV2' })
    )

    let sendLibrary
    let localSendUlnSDK
    /**
     * if custom is true then get the custom send uln config
     */
    if (custom) {
        if (address == null) {
            throw new Error(`Must pass in OApp address when custom param is set to true`)
        }
        const isDefault = await localEndpointSDK.isDefaultSendLibrary(address, remoteEid)
        /**
         * need to return sendLibrary == AddressZero when custom config is using default send library
         */
        sendLibrary = isDefault
            ? '0x0000000000000000000000000000000000000000'
            : await localEndpointSDK.getSendLibrary(address, remoteEid)
        if (sendLibrary == null) {
            throw new Error(`Custom Send Library not set from ${localEid} to ${remoteEid}`)
        }
        /**
         * if using a custom send library use it to retrieve the custom ULN
         * else get the default send library and use it to retrieve the default ULN
         */
        if (!isDefault) {
            localSendUlnSDK = await localEndpointSDK.getUln302SDK(sendLibrary)
        } else {
            const defaultSendLib = await localEndpointSDK.getDefaultSendLibrary(remoteEid)
            if (defaultSendLib == null) {
                throw new Error(`Default Send Library not set from ${localEid} to ${remoteEid}`)
            }
            localSendUlnSDK = await localEndpointSDK.getUln302SDK(defaultSendLib)
        }
    } else {
        /**
         * else if address is defined get the actual send uln config
         * else get the default send uln config
         */
        sendLibrary =
            address == null
                ? await localEndpointSDK.getDefaultSendLibrary(remoteEid)
                : await localEndpointSDK.getSendLibrary(address, remoteEid)
        if (sendLibrary == null) {
            throw new Error(`Default Send Library not set from ${localEid} to ${remoteEid}`)
        }
        localSendUlnSDK = await localEndpointSDK.getUln302SDK(sendLibrary)
    }

    /**
     * if custom is true then get the custom send uln config
     * else if address is defined get the actual send uln config
     * else get the default send uln config
     */
    const sendUlnConfig = custom
        ? await localSendUlnSDK.getAppUlnConfig(remoteEid, address)
        : await localSendUlnSDK.getUlnConfig(remoteEid, address)
    const sendExecutorConfig = custom
        ? await localSendUlnSDK.getAppExecutorConfig(remoteEid, address)
        : await localSendUlnSDK.getExecutorConfig(remoteEid, address)

    return [sendLibrary, sendUlnConfig, sendExecutorConfig]
}

export async function getReceiveConfig(
    localNetworkName: string,
    remoteNetworkName: string,
    address?: OmniAddress,
    custom: boolean = false
): Promise<[OmniAddress, Uln302UlnConfig, Timeout] | undefined> {
    const localEid = getEidForNetworkName(localNetworkName)
    const remoteEid = getEidForNetworkName(remoteNetworkName)
    const providerFactory = createProviderFactory()
    const pointTransformer = createOmniPointHardhatTransformer()
    const EndpointV2Factory = createEndpointV2Factory(providerFactory)
    const localEndpointSDK = await EndpointV2Factory(
        await pointTransformer({ eid: localEid, contractName: 'EndpointV2' })
    )

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
        const [receiveAppLibrary, isDefault] = await localEndpointSDK.getReceiveLibrary(address, remoteEid)
        /**
         * need to return receiveLibrary == AddressZero when custom config is using default receive library
         */
        receiveLibrary = isDefault ? '0x0000000000000000000000000000000000000000' : receiveAppLibrary
        if (receiveLibrary == null) {
            throw new Error(`Custom Receive Library not set from ${localEid} to ${remoteEid}`)
        }
        if (receiveAppLibrary == null) {
            throw new Error(`Default Receive Library not set from ${localEid} to ${remoteEid}`)
        }

        /**
         * use receiveAppLibrary from getReceiveLibrary return to get correct uln
         */
        localReceiveUlnSDK = await localEndpointSDK.getUln302SDK(receiveAppLibrary)
    } else {
        /**
         * else if address is defined get the actual receive uln config
         * else get the default receive uln config
         */
        receiveLibrary =
            address == null
                ? await localEndpointSDK.getDefaultReceiveLibrary(remoteEid)
                : await localEndpointSDK.getReceiveLibrary(address, remoteEid).then(([address]) => address)
        if (receiveLibrary == null) {
            throw new Error(`Default Receive Library not set from ${localEid} to ${remoteEid}`)
        }
        localReceiveUlnSDK = await localEndpointSDK.getUln302SDK(receiveLibrary)
    }
    /**
     * if address is defined get the actual/custom send uln config
     * else get the default send uln config
     */
    const receiveLibraryTimeout =
        address != null
            ? await localEndpointSDK.getReceiveLibraryTimeout(address, remoteEid)
            : await localEndpointSDK.getDefaultReceiveLibraryTimeout(remoteEid)

    /**
     * if custom is true then get the custom receive uln config
     * else if address is defined get the actual send uln config
     * else get the default send uln config
     */
    const receiveUlnConfig = custom
        ? await localReceiveUlnSDK.getAppUlnConfig(remoteEid, address)
        : await localReceiveUlnSDK.getUlnConfig(remoteEid, address)

    return [receiveLibrary, receiveUlnConfig, receiveLibraryTimeout]
}

export async function getExecutorDstConfig(
    localNetworkName: string,
    remoteNetworkName: string
): Promise<ExecutorDstConfig | undefined> {
    const localEid = getEidForNetworkName(localNetworkName)
    const remoteEid = getEidForNetworkName(remoteNetworkName)
    const omnipointTransformer = createOmniPointHardhatTransformer(createContractFactory())
    const executorFactory = createExecutorFactory(createProviderFactory())
    const localExecutorSDK = await executorFactory(
        await omnipointTransformer({ eid: localEid, contractName: 'Executor' })
    )
    return await localExecutorSDK.getDstConfig(remoteEid)
}
