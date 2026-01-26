import type {
    IEndpointV2,
    IUlnRead,
    MessageParams,
    MessagingFee,
    SetConfigParam,
    Timeout,
    Uln302ConfigType,
    Uln302ExecutorConfig,
    Uln302SetExecutorConfig,
    Uln302SetUlnConfig,
    Uln302UlnConfig,
    Uln302UlnUserConfig,
    UlnReadSetUlnConfig,
    UlnReadUlnConfig,
    UlnReadUlnUserConfig,
} from '@layerzerolabs/protocol-devtools'
import { type EndpointId } from '@layerzerolabs/lz-definitions'
import {
    formatEid,
    type Bytes32,
    type OmniAddress,
    type OmniTransaction,
    type PossiblyBytes,
} from '@layerzerolabs/devtools'
import { OmniSDK } from '@layerzerolabs/devtools-starknet'
import type { Call, Contract } from 'starknet'
import type { Uln302 } from '../uln302'
import { STARKNET_ENDPOINT_V2_ADDRESSES } from '../addresses'
import {
    encodeExecutorConfig,
    encodeUlnConfig,
    getEndpointV2Contract,
    getOAppContract,
    MessageLibConfigType,
} from '../protocol'

const RECEIVE_ULN_CONFIG_TYPE = 3

export class EndpointV2 extends OmniSDK implements IEndpointV2 {
    private endpoint?: Contract

    async getUln302SDK(address: OmniAddress): Promise<Uln302> {
        this.logger.debug(`Getting Uln302 SDK for address ${address}`)
        const { Uln302 } = await import('../uln302')
        return new Uln302(this.provider, { eid: this.point.eid, address })
    }

    async getUlnReadSDK(_address: OmniAddress): Promise<IUlnRead> {
        throw new Error('ULN Read functionality is not supported for Starknet.')
    }

    async getDelegate(_oapp: OmniAddress): Promise<OmniAddress | undefined> {
        const oapp = await this.getOApp(_oapp)
        if (!('get_delegate' in oapp)) {
            return this.notImplemented('getDelegate')
        }
        const result = await (oapp as any).get_delegate()
        return this.parseFelt(result)
    }

    async isDelegate(_oapp: OmniAddress, _delegate: OmniAddress): Promise<boolean> {
        const delegate = await this.getDelegate(_oapp)
        return delegate === _delegate
    }

    async getDefaultReceiveLibrary(_eid: EndpointId): Promise<OmniAddress | undefined> {
        const endpoint = await this.getEndpoint()
        const result = await (endpoint as any).get_default_receive_library(_eid)
        return this.parseFelt(result)
    }

    async setDefaultReceiveLibrary(
        _eid: EndpointId,
        _uln: OmniAddress | null | undefined,
        _gracePeriod: bigint = 0n
    ): Promise<OmniTransaction> {
        return this.notImplemented('setDefaultReceiveLibrary')
    }

    async getDefaultSendLibrary(_eid: EndpointId): Promise<OmniAddress | undefined> {
        const endpoint = await this.getEndpoint()
        const result = await (endpoint as any).get_default_send_library(_eid)
        return this.parseFelt(result)
    }

    async setDefaultSendLibrary(_eid: EndpointId, _uln: OmniAddress | null | undefined): Promise<OmniTransaction> {
        return this.notImplemented('setDefaultSendLibrary')
    }

    async isRegisteredLibrary(_uln: OmniAddress): Promise<boolean> {
        return this.notImplemented('isRegisteredLibrary')
    }

    async registerLibrary(_uln: OmniAddress): Promise<OmniTransaction> {
        return this.notImplemented('registerLibrary')
    }

    async isBlockedLibrary(_uln: OmniAddress): Promise<boolean> {
        return this.notImplemented('isBlockedLibrary')
    }

    async getSendLibrary(_sender: OmniAddress, _dstEid: EndpointId): Promise<OmniAddress | undefined> {
        const endpoint = await this.getEndpoint()
        const result = await (endpoint as any).get_send_library(_sender, _dstEid)
        return this.parseFelt(result?.lib ?? result)
    }

    async getReceiveLibrary(
        _receiver: OmniAddress,
        _srcEid: EndpointId
    ): Promise<[address: Bytes32 | undefined, isDefault: boolean]> {
        const endpoint = await this.getEndpoint()
        const result = await (endpoint as any).get_receive_library(_receiver, _srcEid)
        const address = this.parseFelt(result?.lib ?? result)
        const isDefault = Boolean(result?.is_default)
        return [address, isDefault]
    }

    async getDefaultReceiveLibraryTimeout(_eid: EndpointId): Promise<Timeout> {
        return this.notImplemented('getDefaultReceiveLibraryTimeout')
    }

    async getReceiveLibraryTimeout(_receiver: OmniAddress, _srcEid: EndpointId): Promise<Timeout> {
        return this.notImplemented('getReceiveLibraryTimeout')
    }

    async setSendLibrary(_oapp: OmniAddress, _eid: EndpointId, _uln: OmniAddress): Promise<OmniTransaction> {
        const endpoint = await this.getEndpoint()
        const call = (endpoint as any).populateTransaction.set_send_library(_oapp, _eid, _uln)
        return this.createTransactionWithDescription([call], `Setting send library for ${formatEid(_eid)} to ${_uln}`)
    }

    async isDefaultSendLibrary(_sender: PossiblyBytes, _dstEid: EndpointId): Promise<boolean> {
        // Get the send library for this sender and destination
        const sendLib = await this.getSendLibrary(String(_sender), _dstEid)
        // Get the default send library for this destination
        const defaultLib = await this.getDefaultSendLibrary(_dstEid)
        // If the send library matches the default, or if no specific send library is set, it's using the default
        return sendLib === defaultLib || sendLib == null
    }

    async setReceiveLibrary(
        _oapp: OmniAddress,
        _eid: EndpointId,
        _uln: OmniAddress,
        _gracePeriod: bigint
    ): Promise<OmniTransaction> {
        const endpoint = await this.getEndpoint()
        const call = (endpoint as any).populateTransaction.set_receive_library(_oapp, _eid, _uln, _gracePeriod)
        return this.createTransactionWithDescription(
            [call],
            `Setting receive library for ${formatEid(_eid)} to ${_uln}`
        )
    }

    async setReceiveLibraryTimeout(
        _oapp: OmniAddress,
        _eid: EndpointId,
        _uln: OmniAddress,
        _expiry: bigint
    ): Promise<OmniTransaction> {
        return this.notImplemented('setReceiveLibraryTimeout')
    }

    async getExecutorConfig(_oapp: PossiblyBytes, _uln: OmniAddress, _eid: EndpointId): Promise<Uln302ExecutorConfig> {
        const ulnSdk = await this.getUln302SDK(_uln)
        return ulnSdk.getExecutorConfig(_eid, String(_oapp))
    }

    async getAppExecutorConfig(
        _oapp: PossiblyBytes,
        _uln: OmniAddress,
        _eid: EndpointId
    ): Promise<Uln302ExecutorConfig> {
        const ulnSdk = await this.getUln302SDK(_uln)
        return ulnSdk.getAppExecutorConfig(_eid, String(_oapp))
    }

    async hasAppExecutorConfig(
        _oapp: OmniAddress,
        _uln: OmniAddress,
        _eid: EndpointId,
        _config: Uln302ExecutorConfig
    ): Promise<boolean> {
        const ulnSdk = await this.getUln302SDK(_uln)
        return ulnSdk.hasAppExecutorConfig(_eid, _oapp, _config)
    }

    async setExecutorConfig(
        _oapp: PossiblyBytes,
        _uln: PossiblyBytes,
        _setExecutorConfig: Uln302SetExecutorConfig[]
    ): Promise<OmniTransaction[]> {
        const endpoint = await this.getEndpoint()
        return _setExecutorConfig.map(({ eid, executorConfig }) => {
            const encoded = encodeExecutorConfig({
                max_message_size: executorConfig.maxMessageSize,
                executor: executorConfig.executor,
            })
            const call = (endpoint as any).populateTransaction.set_send_configs(String(_oapp), String(_uln), [
                {
                    eid,
                    config_type: MessageLibConfigType.EXECUTOR,
                    config: encoded,
                },
            ])
            return this.createTransactionWithDescription([call], `Setting executor config for ${formatEid(eid)}`)
        })
    }

    async getUlnConfig(
        _oapp: OmniAddress,
        _uln: OmniAddress,
        _eid: EndpointId,
        _type: Uln302ConfigType
    ): Promise<Uln302UlnConfig> {
        const ulnSdk = await this.getUln302SDK(_uln)
        return ulnSdk.getUlnConfig(_eid, _oapp, _type)
    }

    async getAppUlnConfig(
        _oapp: OmniAddress,
        _uln: OmniAddress,
        _eid: EndpointId,
        _type: Uln302ConfigType
    ): Promise<Uln302UlnConfig> {
        const ulnSdk = await this.getUln302SDK(_uln)
        return ulnSdk.getAppUlnConfig(_eid, _oapp, _type)
    }

    async getAppUlnReadConfig(_oapp: OmniAddress, _uln: OmniAddress, _channelId: number): Promise<UlnReadUlnConfig> {
        throw new Error('ULN Read functionality is not supported for Starknet.')
    }

    async hasAppUlnConfig(
        _oapp: OmniAddress,
        _uln: OmniAddress,
        _eid: EndpointId,
        _config: Uln302UlnUserConfig,
        _type: Uln302ConfigType
    ): Promise<boolean> {
        const ulnSdk = await this.getUln302SDK(_uln)
        return ulnSdk.hasAppUlnConfig(_eid, _oapp, _config, _type)
    }

    async hasAppUlnReadConfig(
        _oapp: OmniAddress,
        _uln: OmniAddress,
        _channelId: number,
        _config: UlnReadUlnUserConfig
    ): Promise<boolean> {
        throw new Error('ULN Read functionality is not supported for Starknet.')
    }

    async setUlnConfig(
        _oapp: OmniAddress,
        _uln: OmniAddress,
        _setUlnConfig: Uln302SetUlnConfig[]
    ): Promise<OmniTransaction[]> {
        const endpoint = await this.getEndpoint()
        return _setUlnConfig.map(({ eid, ulnConfig, type }) => {
            const encoded = encodeUlnConfig({
                confirmations: ulnConfig.confirmations ?? 0n,
                required_dvns: ulnConfig.requiredDVNs,
                optional_dvns: ulnConfig.optionalDVNs ?? [],
                optional_dvn_threshold: ulnConfig.optionalDVNThreshold ?? 0,
            })
            const call =
                type === 'send'
                    ? (endpoint as any).populateTransaction.set_send_configs(_oapp, _uln, [
                          {
                              eid,
                              config_type: MessageLibConfigType.ULN,
                              config: encoded,
                          },
                      ])
                    : (endpoint as any).populateTransaction.set_receive_configs(_oapp, _uln, [
                          {
                              eid,
                              config_type: MessageLibConfigType.ULN,
                              config: encoded,
                          },
                      ])
            return this.createTransactionWithDescription([call], `Setting ${type} ULN config for ${formatEid(eid)}`)
        })
    }

    async setUlnReadConfig(
        _oapp: OmniAddress,
        _uln: OmniAddress,
        _setUlnConfig: UlnReadSetUlnConfig[]
    ): Promise<OmniTransaction[]> {
        throw new Error('ULN Read functionality is not supported for Starknet.')
    }

    async getUlnConfigParams(_uln: OmniAddress, _setUlnConfig: Uln302SetUlnConfig[]): Promise<SetConfigParam[]> {
        return _setUlnConfig.map(({ eid, ulnConfig, type }) => {
            return {
                eid,
                configType: type === 'send' ? MessageLibConfigType.ULN : RECEIVE_ULN_CONFIG_TYPE,
                config: encodeUlnConfig({
                    confirmations: ulnConfig.confirmations ?? 0n,
                    required_dvns: ulnConfig.requiredDVNs,
                    optional_dvns: ulnConfig.optionalDVNs ?? [],
                    optional_dvn_threshold: ulnConfig.optionalDVNThreshold ?? 0,
                }),
            }
        })
    }

    async getUlnReadConfigParams(_uln: OmniAddress, _setUlnConfig: UlnReadSetUlnConfig[]): Promise<SetConfigParam[]> {
        throw new Error('ULN Read functionality is not supported for Starknet.')
    }

    async getExecutorConfigParams(
        _uln: OmniAddress,
        _setExecutorConfig: Uln302SetExecutorConfig[]
    ): Promise<SetConfigParam[]> {
        return _setExecutorConfig.map(({ eid, executorConfig }) => ({
            eid,
            configType: MessageLibConfigType.EXECUTOR,
            config: encodeExecutorConfig({
                max_message_size: executorConfig.maxMessageSize,
                executor: executorConfig.executor,
            }),
        }))
    }

    async setConfig(
        _oapp: OmniAddress,
        _uln: OmniAddress,
        _setConfigParam: SetConfigParam[]
    ): Promise<OmniTransaction[]> {
        const endpoint = await this.getEndpoint()
        return _setConfigParam.map(({ eid, configType, config }) => {
            if (configType === RECEIVE_ULN_CONFIG_TYPE) {
                const call = (endpoint as any).populateTransaction.set_receive_configs(_oapp, _uln, [
                    {
                        eid,
                        config_type: MessageLibConfigType.ULN,
                        config,
                    },
                ])
                return this.createTransactionWithDescription([call], `Setting receive ULN config for ${formatEid(eid)}`)
            }

            const call = (endpoint as any).populateTransaction.set_send_configs(_oapp, _uln, [
                {
                    eid,
                    config_type: configType,
                    config,
                },
            ])
            return this.createTransactionWithDescription(
                [call],
                `Setting send config ${configType} for ${formatEid(eid)}`
            )
        })
    }

    async quote(_params: MessageParams, _sender: OmniAddress): Promise<MessagingFee> {
        return this.notImplemented('quote')
    }

    private notImplemented(method: string): never {
        throw new TypeError(`${method}() not implemented on Starknet Endpoint SDK`)
    }

    private async getEndpoint(): Promise<Contract> {
        if (!this.endpoint) {
            const endpointAddress = STARKNET_ENDPOINT_V2_ADDRESSES[this.point.eid]
            if (!endpointAddress) {
                throw new Error(`Missing Starknet EndpointV2 address for eid ${this.point.eid}`)
            }
            this.endpoint = getEndpointV2Contract(endpointAddress, this.provider)
        }
        return this.endpoint!
    }

    private async getOApp(address: OmniAddress): Promise<Contract> {
        return getOAppContract(address, this.provider)
    }

    protected override createTransaction(calls: Call[]): OmniTransaction {
        return super.createTransaction(calls)
    }

    private createTransactionWithDescription(calls: Call[], description: string): OmniTransaction {
        return { ...super.createTransaction(calls), description }
    }

    private parseFelt(value: unknown): string | undefined {
        if (value == null) {
            return undefined
        }
        let hexValue: string | undefined
        if (typeof value === 'string') {
            hexValue = value
        } else if (typeof value === 'bigint') {
            hexValue = `0x${value.toString(16)}`
        } else if (typeof value === 'object' && value !== null && 'value' in value) {
            const feltValue = (value as { value: bigint | string }).value
            hexValue = typeof feltValue === 'bigint' ? `0x${feltValue.toString(16)}` : String(feltValue)
        }
        // Normalize Starknet felt252 addresses by removing leading zeros after 0x
        // This ensures consistent comparison regardless of how addresses are formatted
        // e.g., 0x0727f... and 0x727f... should be treated as the same address
        if (hexValue) {
            const normalized = hexValue.toLowerCase().replace(/^0x0*/, '0x')
            return normalized === '0x' ? '0x0' : normalized
        }
        return undefined
    }
}
