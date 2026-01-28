import type { OmniAddress, OmniTransaction, Bytes32, PossiblyBytes } from '@layerzerolabs/devtools'
import type {
    IEndpointV2,
    IUln302,
    IUlnRead,
    MessageParams,
    MessagingFee,
    SetConfigParam,
    Timeout,
    Uln302ExecutorConfig,
    Uln302SetExecutorConfig,
    Uln302SetUlnConfig,
    Uln302UlnConfig,
    Uln302UlnUserConfig,
    UlnReadSetUlnConfig,
    UlnReadUlnConfig,
    UlnReadUlnUserConfig,
} from '@layerzerolabs/protocol-devtools'
import { Uln302ConfigType } from '@layerzerolabs/protocol-devtools'
import type { EndpointId } from '@layerzerolabs/lz-definitions'
import { OmniSDK, type ConnectionFactory } from '@layerzerolabs/devtools-aptos'

import { Uln302 } from '../uln302/sdk'

/**
 * Aptos implementation of IEndpointV2
 *
 * This SDK provides methods to interact with the LayerZero EndpointV2 contract on Aptos.
 */
export class EndpointV2 extends OmniSDK implements IEndpointV2 {
    private endpointAddress: string

    constructor(
        point: { eid: EndpointId; address: OmniAddress },
        connectionFactory?: ConnectionFactory,
        endpointAddress?: string
    ) {
        // Cast to any to handle potential lz-definitions version mismatches between packages
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        super(point as any, connectionFactory)
        // The endpoint address can be provided separately or defaults to the point address
        this.endpointAddress = endpointAddress ?? point.address
    }

    async getUln302SDK(address: OmniAddress): Promise<IUln302> {
        return new Uln302({ eid: this.point.eid, address }, this.connectionFactory)
    }

    async getUlnReadSDK(_address: OmniAddress): Promise<IUlnRead> {
        // UlnRead is not implemented for Aptos yet
        throw new Error('UlnRead is not supported on Aptos')
    }

    async getDelegate(oapp: OmniAddress): Promise<OmniAddress | undefined> {
        try {
            const aptos = await this.getAptos()
            const result = await aptos.view({
                payload: {
                    function: `${oapp}::oapp_core::get_delegate`,
                    functionArguments: [],
                },
            })
            return result[0] as string | undefined
        } catch {
            return undefined
        }
    }

    async isDelegate(oapp: OmniAddress, delegate: OmniAddress): Promise<boolean> {
        const currentDelegate = await this.getDelegate(oapp)
        return currentDelegate?.toLowerCase() === delegate.toLowerCase()
    }

    async getDefaultReceiveLibrary(eid: EndpointId): Promise<OmniAddress | undefined> {
        try {
            const aptos = await this.getAptos()
            const result = await aptos.view({
                payload: {
                    function: `${this.endpointAddress}::endpoint::get_default_receive_library`,
                    functionArguments: [eid],
                },
            })
            return result[0] as string | undefined
        } catch {
            return undefined
        }
    }

    async setDefaultReceiveLibrary(
        eid: EndpointId,
        uln: OmniAddress | null | undefined,
        gracePeriod?: bigint
    ): Promise<OmniTransaction> {
        return {
            point: this.point,
            data: JSON.stringify({
                function: `${this.endpointAddress}::endpoint::set_default_receive_library`,
                functionArguments: [eid, uln, gracePeriod ?? 0],
            }),
            description: `Setting default receive library for eid ${eid} to ${uln}`,
        }
    }

    async getDefaultSendLibrary(eid: EndpointId): Promise<OmniAddress | undefined> {
        try {
            const aptos = await this.getAptos()
            const result = await aptos.view({
                payload: {
                    function: `${this.endpointAddress}::endpoint::get_default_send_library`,
                    functionArguments: [eid],
                },
            })
            return result[0] as string | undefined
        } catch {
            return undefined
        }
    }

    async setDefaultSendLibrary(eid: EndpointId, uln: OmniAddress | null | undefined): Promise<OmniTransaction> {
        return {
            point: this.point,
            data: JSON.stringify({
                function: `${this.endpointAddress}::endpoint::set_default_send_library`,
                functionArguments: [eid, uln],
            }),
            description: `Setting default send library for eid ${eid} to ${uln}`,
        }
    }

    async isRegisteredLibrary(_uln: OmniAddress): Promise<boolean> {
        // Aptos doesn't have a registry check - libraries are registered by default if they exist
        return true
    }

    async registerLibrary(_uln: OmniAddress): Promise<OmniTransaction> {
        // Aptos doesn't require explicit library registration
        return {
            point: this.point,
            data: '0x',
            description: 'Library registration not required on Aptos',
        }
    }

    async isBlockedLibrary(_uln: OmniAddress): Promise<boolean> {
        return false
    }

    async getSendLibrary(sender: OmniAddress, dstEid: EndpointId): Promise<OmniAddress | undefined> {
        try {
            const aptos = await this.getAptos()
            const result = await aptos.view({
                payload: {
                    function: `${this.endpointAddress}::endpoint::get_effective_send_library`,
                    functionArguments: [sender, dstEid],
                },
            })
            return result[0] as string | undefined
        } catch {
            return undefined
        }
    }

    async getReceiveLibrary(
        receiver: OmniAddress,
        srcEid: EndpointId
    ): Promise<[address: Bytes32 | undefined, isDefault: boolean]> {
        try {
            const aptos = await this.getAptos()
            const result = await aptos.view({
                payload: {
                    function: `${this.endpointAddress}::endpoint::get_effective_receive_library`,
                    functionArguments: [receiver, srcEid],
                },
            })
            return [result[0] as string | undefined, result[1] as boolean]
        } catch {
            return [undefined, true]
        }
    }

    async getDefaultReceiveLibraryTimeout(eid: EndpointId): Promise<Timeout> {
        try {
            const aptos = await this.getAptos()
            const result = await aptos.view({
                payload: {
                    function: `${this.endpointAddress}::endpoint::get_default_receive_library_timeout`,
                    functionArguments: [eid],
                },
            })
            return {
                expiry: BigInt(result[0]?.toString() ?? '0'),
                lib: result[1] as string,
            }
        } catch {
            return { expiry: BigInt(0), lib: '' }
        }
    }

    async getReceiveLibraryTimeout(receiver: OmniAddress, srcEid: EndpointId): Promise<Timeout> {
        try {
            const aptos = await this.getAptos()
            const result = await aptos.view({
                payload: {
                    function: `${this.endpointAddress}::endpoint::get_receive_library_timeout`,
                    functionArguments: [receiver, srcEid],
                },
            })
            return {
                expiry: BigInt(result[0]?.toString() ?? '0'),
                lib: result[1] as string,
            }
        } catch {
            // Return a value that will always produce a diff if timeout is not set
            return { expiry: BigInt(-1), lib: '' }
        }
    }

    async setSendLibrary(oapp: OmniAddress, eid: EndpointId, uln: OmniAddress): Promise<OmniTransaction> {
        return {
            point: this.point,
            data: JSON.stringify({
                function: `${oapp}::oapp_core::set_send_library`,
                functionArguments: [eid, uln],
                types: ['u32', 'address'],
            }),
            description: `Setting send library for eid ${eid} to ${uln}`,
        }
    }

    async isDefaultSendLibrary(sender: PossiblyBytes, dstEid: EndpointId): Promise<boolean> {
        const sendLibrary = await this.getSendLibrary(sender as OmniAddress, dstEid)
        const defaultLibrary = await this.getDefaultSendLibrary(dstEid)
        return sendLibrary === defaultLibrary
    }

    async setReceiveLibrary(
        oapp: OmniAddress,
        eid: EndpointId,
        uln: OmniAddress,
        gracePeriod: bigint
    ): Promise<OmniTransaction> {
        return {
            point: this.point,
            data: JSON.stringify({
                function: `${oapp}::oapp_core::set_receive_library`,
                functionArguments: [eid, uln, gracePeriod],
                types: ['u32', 'address', 'u64'],
            }),
            description: `Setting receive library for eid ${eid} to ${uln} with grace period ${gracePeriod}`,
        }
    }

    async setReceiveLibraryTimeout(
        oapp: OmniAddress,
        eid: EndpointId,
        uln: OmniAddress,
        expiry: bigint
    ): Promise<OmniTransaction> {
        return {
            point: this.point,
            data: JSON.stringify({
                function: `${oapp}::oapp_core::set_receive_library_timeout`,
                functionArguments: [eid, uln, expiry],
                types: ['u32', 'address', 'u64'],
            }),
            description: `Setting receive library timeout for eid ${eid} to ${uln} with expiry ${expiry}`,
        }
    }

    async getExecutorConfig(oapp: PossiblyBytes, uln: OmniAddress, eid: EndpointId): Promise<Uln302ExecutorConfig> {
        const ulnSdk = await this.getUln302SDK(uln)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return ulnSdk.getExecutorConfig(eid as any, oapp as OmniAddress)
    }

    async getAppExecutorConfig(oapp: PossiblyBytes, uln: OmniAddress, eid: EndpointId): Promise<Uln302ExecutorConfig> {
        const ulnSdk = await this.getUln302SDK(uln)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return ulnSdk.getAppExecutorConfig(eid as any, oapp as OmniAddress)
    }

    async hasAppExecutorConfig(
        oapp: OmniAddress,
        uln: OmniAddress,
        eid: EndpointId,
        config: Uln302ExecutorConfig
    ): Promise<boolean> {
        const ulnSdk = await this.getUln302SDK(uln)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return ulnSdk.hasAppExecutorConfig(eid as any, oapp, config)
    }

    async setExecutorConfig(
        oapp: PossiblyBytes,
        uln: PossiblyBytes,
        setExecutorConfig: Uln302SetExecutorConfig[]
    ): Promise<OmniTransaction[]> {
        const transactions: OmniTransaction[] = []

        for (const config of setExecutorConfig) {
            // For Aptos, we set config through the OApp
            transactions.push({
                point: this.point,
                data: JSON.stringify({
                    function: `${oapp}::oapp_core::set_config`,
                    functionArguments: [
                        uln,
                        config.eid,
                        1, // EXECUTOR config type
                        this.encodeExecutorConfig(config.executorConfig),
                    ],
                    types: ['address', 'u32', 'u32', 'u8'],
                }),
                description: `Setting executor config for eid ${config.eid}`,
            })
        }

        return transactions
    }

    async getUlnConfig(
        oapp: OmniAddress,
        uln: OmniAddress,
        eid: EndpointId,
        type: Uln302ConfigType
    ): Promise<Uln302UlnConfig> {
        const ulnSdk = await this.getUln302SDK(uln)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return ulnSdk.getUlnConfig(eid as any, oapp, type)
    }

    async getAppUlnConfig(
        oapp: OmniAddress,
        uln: OmniAddress,
        eid: EndpointId,
        type: Uln302ConfigType
    ): Promise<Uln302UlnConfig> {
        const ulnSdk = await this.getUln302SDK(uln)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return ulnSdk.getAppUlnConfig(eid as any, oapp, type)
    }

    async getAppUlnReadConfig(_oapp: OmniAddress, _uln: OmniAddress, _channelId: number): Promise<UlnReadUlnConfig> {
        throw new Error('UlnRead is not supported on Aptos')
    }

    async hasAppUlnConfig(
        oapp: OmniAddress,
        uln: OmniAddress,
        eid: EndpointId,
        config: Uln302UlnUserConfig,
        type: Uln302ConfigType
    ): Promise<boolean> {
        const ulnSdk = await this.getUln302SDK(uln)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return ulnSdk.hasAppUlnConfig(eid as any, oapp, config, type)
    }

    async hasAppUlnReadConfig(
        _oapp: OmniAddress,
        _uln: OmniAddress,
        _channelId: number,
        _config: UlnReadUlnUserConfig
    ): Promise<boolean> {
        throw new Error('UlnRead is not supported on Aptos')
    }

    async setUlnConfig(
        oapp: OmniAddress,
        uln: OmniAddress,
        setUlnConfig: Uln302SetUlnConfig[]
    ): Promise<OmniTransaction[]> {
        const transactions: OmniTransaction[] = []

        for (const config of setUlnConfig) {
            const configType = config.type === Uln302ConfigType.Send ? 2 : 3 // Send = 2, Receive = 3

            transactions.push({
                point: this.point,
                data: JSON.stringify({
                    function: `${oapp}::oapp_core::set_config`,
                    functionArguments: [uln, config.eid, configType, this.encodeUlnConfig(config.ulnConfig)],
                    types: ['address', 'u32', 'u32', 'u8'],
                }),
                description: `Setting ULN ${config.type} config for eid ${config.eid}`,
            })
        }

        return transactions
    }

    async setUlnReadConfig(
        _oapp: OmniAddress,
        _uln: OmniAddress,
        _setUlnConfig: UlnReadSetUlnConfig[]
    ): Promise<OmniTransaction[]> {
        throw new Error('UlnRead is not supported on Aptos')
    }

    async getUlnConfigParams(_uln: OmniAddress, setUlnConfig: Uln302SetUlnConfig[]): Promise<SetConfigParam[]> {
        return setUlnConfig.map((config) => ({
            eid: config.eid,
            configType: config.type === Uln302ConfigType.Send ? 2 : 3,
            config: this.encodeUlnConfig(config.ulnConfig),
        }))
    }

    async getUlnReadConfigParams(_uln: OmniAddress, _setUlnConfig: UlnReadSetUlnConfig[]): Promise<SetConfigParam[]> {
        throw new Error('UlnRead is not supported on Aptos')
    }

    async getExecutorConfigParams(
        _uln: OmniAddress,
        setExecutorConfig: Uln302SetExecutorConfig[]
    ): Promise<SetConfigParam[]> {
        return setExecutorConfig.map((config) => ({
            eid: config.eid,
            configType: 1, // EXECUTOR config type
            config: this.encodeExecutorConfig(config.executorConfig),
        }))
    }

    async setConfig(oapp: OmniAddress, uln: OmniAddress, setConfigParam: SetConfigParam[]): Promise<OmniTransaction[]> {
        return setConfigParam.map((param) => ({
            point: this.point,
            data: JSON.stringify({
                function: `${oapp}::oapp_core::set_config`,
                functionArguments: [uln, param.eid, param.configType, param.config],
                types: ['address', 'u32', 'u32', 'u8'],
            }),
            description: `Setting config type ${param.configType} for eid ${param.eid}`,
        }))
    }

    async quote(_params: MessageParams, _sender: OmniAddress): Promise<MessagingFee> {
        // Quote implementation would need to call the endpoint contract
        // For now, return a placeholder
        return {
            nativeFee: BigInt(0),
            lzTokenFee: BigInt(0),
        }
    }

    /**
     * Encode executor config to bytes
     */
    private encodeExecutorConfig(config: Uln302ExecutorConfig): Uint8Array {
        // Simple encoding - in practice this would use proper BCS encoding
        const encoder = new TextEncoder()
        return encoder.encode(JSON.stringify(config))
    }

    /**
     * Encode ULN config to bytes
     */
    private encodeUlnConfig(config: Uln302UlnUserConfig): Uint8Array {
        // Simple encoding - in practice this would use proper BCS encoding
        const encoder = new TextEncoder()
        return encoder.encode(JSON.stringify(config))
    }
}
