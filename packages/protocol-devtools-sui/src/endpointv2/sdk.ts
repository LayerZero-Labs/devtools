import { Transaction } from '@mysten/sui/transactions'
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
import { endpointIdToStage, Stage, type EndpointId } from '@layerzerolabs/lz-definitions'
import { type Bytes32, type OmniAddress, type OmniTransaction, type PossiblyBytes } from '@layerzerolabs/devtools'
import { OmniSDK } from '@layerzerolabs/devtools-sui'
import { CONFIG_TYPE, ExecutorConfigBcs, OAppUlnConfigBcs, SDK } from '@layerzerolabs/lz-sui-sdk-v2'
import type { Endpoint, OApp, ExecutorConfig, OAppUlnConfig } from '@layerzerolabs/lz-sui-sdk-v2'
import type { Uln302 } from '../uln302'

export class EndpointV2 extends OmniSDK implements IEndpointV2 {
    private sdk?: SDK
    private oapp?: OApp
    private endpoint?: Endpoint

    async getUln302SDK(address: OmniAddress): Promise<Uln302> {
        this.logger.debug(`Getting Uln302 SDK for address ${address}`)
        const { Uln302 } = await import('../uln302')
        return new Uln302(this.client, { eid: this.point.eid, address })
    }

    async getUlnReadSDK(_address: OmniAddress): Promise<IUlnRead> {
        throw new Error('ULN Read functionality is not supported for Sui.')
    }

    async getDelegate(_oapp: OmniAddress): Promise<OmniAddress | undefined> {
        return this.getEndpoint().getDelegate(_oapp)
    }

    async isDelegate(_oapp: OmniAddress, _delegate: OmniAddress): Promise<boolean> {
        const delegate = await this.getDelegate(_oapp)
        return delegate === _delegate
    }

    async getDefaultReceiveLibrary(_eid: EndpointId): Promise<OmniAddress | undefined> {
        return this.getEndpoint().getDefaultReceiveLibrary(_eid)
    }

    async setDefaultReceiveLibrary(
        _eid: EndpointId,
        _uln: OmniAddress | null | undefined,
        _gracePeriod: bigint = 0n
    ): Promise<OmniTransaction> {
        const tx = new Transaction()
        this.getEndpoint().setDefaultReceiveLibraryMoveCall(tx, _eid, _uln ?? '0x0', _gracePeriod)
        return this.createTransaction(tx)
    }

    async getDefaultSendLibrary(_eid: EndpointId): Promise<OmniAddress | undefined> {
        return this.getEndpoint().getDefaultSendLibrary(_eid)
    }

    async setDefaultSendLibrary(_eid: EndpointId, _uln: OmniAddress | null | undefined): Promise<OmniTransaction> {
        const tx = new Transaction()
        this.getEndpoint().setDefaultSendLibraryMoveCall(tx, _eid, _uln ?? '0x0')
        return this.createTransaction(tx)
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
        const [library] = await this.getEndpoint().getSendLibrary(_sender, _dstEid)
        return library
    }

    async getReceiveLibrary(
        _receiver: OmniAddress,
        _srcEid: EndpointId
    ): Promise<[address: Bytes32 | undefined, isDefault: boolean]> {
        const [library, isDefault] = await this.getEndpoint().getReceiveLibrary(_receiver, _srcEid)
        return [library, isDefault]
    }

    async getDefaultReceiveLibraryTimeout(_eid: EndpointId): Promise<Timeout> {
        const timeout = await this.getEndpoint().getDefaultReceiveLibraryTimeout(_eid)
        if (!timeout) {
            return { lib: '0x0', expiry: 0n }
        }
        return { lib: timeout.fallbackLib, expiry: timeout.expiry }
    }

    async getReceiveLibraryTimeout(_receiver: OmniAddress, _srcEid: EndpointId): Promise<Timeout> {
        const timeout = await this.getEndpoint().getReceiveLibraryTimeout(_receiver, _srcEid)
        if (!timeout) {
            return { lib: '0x0', expiry: 0n }
        }
        return { lib: timeout.fallbackLib, expiry: timeout.expiry }
    }

    async setSendLibrary(_oapp: OmniAddress, _eid: EndpointId, _uln: OmniAddress): Promise<OmniTransaction> {
        const tx = new Transaction()
        await this.getOApp(_oapp).setSendLibraryMoveCall(tx, _eid, _uln)
        return this.createTransaction(tx)
    }

    async isDefaultSendLibrary(_sender: PossiblyBytes, _dstEid: EndpointId): Promise<boolean> {
        const [_, isDefault] = await this.getEndpoint().getSendLibrary(String(_sender), _dstEid)
        return isDefault
    }

    async setReceiveLibrary(
        _oapp: OmniAddress,
        _eid: EndpointId,
        _uln: OmniAddress,
        _gracePeriod: bigint
    ): Promise<OmniTransaction> {
        const tx = new Transaction()
        await this.getOApp(_oapp).setReceiveLibraryMoveCall(tx, _eid, _uln, _gracePeriod)
        return this.createTransaction(tx)
    }

    async setReceiveLibraryTimeout(
        _oapp: OmniAddress,
        _eid: EndpointId,
        _uln: OmniAddress,
        _expiry: bigint
    ): Promise<OmniTransaction> {
        const tx = new Transaction()
        await this.getOApp(_oapp).setReceiveLibraryTimeoutMoveCall(tx, _eid, _uln, _expiry)
        return this.createTransaction(tx)
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
        return this.createConfigTransactions(String(_oapp), String(_uln), _setExecutorConfig, CONFIG_TYPE.EXECUTOR)
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
        throw new Error('ULN Read functionality is not supported for Sui.')
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
        throw new Error('ULN Read functionality is not supported for Sui.')
    }

    async setUlnConfig(
        _oapp: OmniAddress,
        _uln: OmniAddress,
        _setUlnConfig: Uln302SetUlnConfig[]
    ): Promise<OmniTransaction[]> {
        return this.createConfigTransactions(_oapp, _uln, _setUlnConfig, CONFIG_TYPE.SEND_ULN)
    }

    async setUlnReadConfig(
        _oapp: OmniAddress,
        _uln: OmniAddress,
        _setUlnConfig: UlnReadSetUlnConfig[]
    ): Promise<OmniTransaction[]> {
        throw new Error('ULN Read functionality is not supported for Sui.')
    }

    async getUlnConfigParams(_uln: OmniAddress, _setUlnConfig: Uln302SetUlnConfig[]): Promise<SetConfigParam[]> {
        return _setUlnConfig.map(({ eid, ulnConfig, type }) => ({
            eid,
            configType: type === 'send' ? CONFIG_TYPE.SEND_ULN : CONFIG_TYPE.RECEIVE_ULN,
            config: this.serializeUlnConfig(ulnConfig),
        }))
    }

    async getUlnReadConfigParams(_uln: OmniAddress, _setUlnConfig: UlnReadSetUlnConfig[]): Promise<SetConfigParam[]> {
        throw new Error('ULN Read functionality is not supported for Sui.')
    }

    async getExecutorConfigParams(
        _uln: OmniAddress,
        _setExecutorConfig: Uln302SetExecutorConfig[]
    ): Promise<SetConfigParam[]> {
        return _setExecutorConfig.map(({ eid, executorConfig }) => ({
            eid,
            configType: CONFIG_TYPE.EXECUTOR,
            config: this.serializeExecutorConfig(executorConfig),
        }))
    }

    async setConfig(
        _oapp: OmniAddress,
        _uln: OmniAddress,
        _setConfigParam: SetConfigParam[]
    ): Promise<OmniTransaction[]> {
        const txs: OmniTransaction[] = []
        for (const param of _setConfigParam) {
            const tx = new Transaction()
            const setConfigCall = await this.getOApp(_oapp).setConfigMoveCall(
                tx,
                _uln,
                param.eid,
                param.configType,
                param.config as Uint8Array
            )
            // The setConfigMoveCall returns a Call<MessageLibSetConfigParam, Void> that must be
            // populated using the endpoint's populateSetConfigTransaction to build the complete transaction
            await this.getEndpoint().populateSetConfigTransaction(tx, setConfigCall)
            txs.push(await this.createTransaction(tx))
        }
        return txs
    }

    async quote(_params: MessageParams, _sender: OmniAddress): Promise<MessagingFee> {
        return this.notImplemented('quote')
    }

    private notImplemented(method: string): never {
        throw new TypeError(`${method}() not implemented on Sui Endpoint SDK`)
    }

    private getSdk(): SDK {
        if (!this.sdk) {
            const stage = endpointIdToStage(this.point.eid) as Stage
            this.sdk = new SDK({ client: this.client, stage })
        }
        return this.sdk
    }

    private getOApp(callCapId: OmniAddress = this.point.address): OApp {
        if (callCapId === this.point.address) {
            if (!this.oapp) {
                this.oapp = this.getSdk().getOApp(callCapId)
            }
            return this.oapp
        }
        return this.getSdk().getOApp(callCapId)
    }

    private getEndpoint(): Endpoint {
        if (!this.endpoint) {
            this.endpoint = this.getSdk().getEndpoint()
        }
        return this.endpoint
    }

    private serializeExecutorConfig(config: Uln302ExecutorConfig): Uint8Array {
        const executorConfig: ExecutorConfig = {
            maxMessageSize: config.maxMessageSize,
            executor: config.executor,
        }
        return ExecutorConfigBcs.serialize({
            max_message_size: executorConfig.maxMessageSize,
            executor: executorConfig.executor,
        }).toBytes()
    }

    private serializeUlnConfig(config: Uln302UlnUserConfig): Uint8Array {
        const useDefaultConfirmations = config.confirmations == null
        const useDefaultRequiredDvns = config.requiredDVNs.length === 0
        const useDefaultOptionalDvns = config.optionalDVNs == null
        const ulnConfig: OAppUlnConfig = {
            useDefaultConfirmations,
            useDefaultRequiredDvns,
            useDefaultOptionalDvns,
            ulnConfig: {
                confirmations: config.confirmations ?? 0n,
                requiredDvns: config.requiredDVNs,
                optionalDvns: config.optionalDVNs ?? [],
                optionalDvnThreshold: config.optionalDVNThreshold ?? 0,
            },
        }
        return OAppUlnConfigBcs.serialize({
            use_default_confirmations: ulnConfig.useDefaultConfirmations,
            use_default_required_dvns: ulnConfig.useDefaultRequiredDvns,
            use_default_optional_dvns: ulnConfig.useDefaultOptionalDvns,
            uln_config: {
                confirmations: ulnConfig.ulnConfig.confirmations,
                required_dvns: ulnConfig.ulnConfig.requiredDvns,
                optional_dvns: ulnConfig.ulnConfig.optionalDvns,
                optional_dvn_threshold: ulnConfig.ulnConfig.optionalDvnThreshold,
            },
        }).toBytes()
    }

    private async createConfigTransactions(
        oapp: OmniAddress,
        uln: OmniAddress,
        configs: Uln302SetExecutorConfig[] | Uln302SetUlnConfig[],
        configType: number
    ): Promise<OmniTransaction[]> {
        const txs: OmniTransaction[] = []
        for (const config of configs) {
            const tx = new Transaction()
            let setConfigCall
            if ('executorConfig' in config) {
                const bytes = this.serializeExecutorConfig(config.executorConfig)
                setConfigCall = await this.getOApp(oapp).setConfigMoveCall(tx, uln, config.eid, configType, bytes)
            } else {
                const bytes = this.serializeUlnConfig(config.ulnConfig)
                const type = config.type === 'send' ? CONFIG_TYPE.SEND_ULN : CONFIG_TYPE.RECEIVE_ULN
                setConfigCall = await this.getOApp(oapp).setConfigMoveCall(tx, uln, config.eid, type, bytes)
            }
            // The setConfigMoveCall returns a Call<MessageLibSetConfigParam, Void> that must be
            // populated using the endpoint's populateSetConfigTransaction to build the complete transaction
            await this.getEndpoint().populateSetConfigTransaction(tx, setConfigCall)
            txs.push(await this.createTransaction(tx))
        }
        return txs
    }
}
