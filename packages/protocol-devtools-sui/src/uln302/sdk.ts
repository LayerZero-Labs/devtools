import { Transaction } from '@mysten/sui/transactions'
import type {
    IUln302,
    Uln302ConfigType,
    Uln302ExecutorConfig,
    Uln302UlnConfig,
    Uln302UlnUserConfig,
} from '@layerzerolabs/protocol-devtools'
import { endpointIdToStage, Stage, type EndpointId } from '@layerzerolabs/lz-definitions'
import type { OmniAddress, OmniTransaction } from '@layerzerolabs/devtools'
import { OmniSDK } from '@layerzerolabs/devtools-sui'
import { SDK } from '@layerzerolabs/lz-sui-sdk-v2'
import type { ExecutorConfig, OAppUlnConfig, UlnConfig, Uln302 as SuiUln302 } from '@layerzerolabs/lz-sui-sdk-v2'

export class Uln302 extends OmniSDK implements IUln302 {
    private sdk?: SDK
    private uln?: SuiUln302

    async getUlnConfig(
        _eid: EndpointId,
        _address: OmniAddress | null | undefined,
        _type: Uln302ConfigType
    ): Promise<Uln302UlnConfig> {
        if (_type === 'send') {
            const config = _address
                ? await this.getUln().getEffectiveSendUlnConfig(_address, _eid)
                : await this.getUln().getDefaultSendUlnConfig(_eid)
            return this.toUlnConfig(config)
        }

        const config = _address
            ? await this.getUln().getEffectiveReceiveUlnConfig(_address, _eid)
            : await this.getUln().getDefaultReceiveUlnConfig(_eid)
        return this.toUlnConfig(config)
    }

    async getAppUlnConfig(_eid: EndpointId, _address: OmniAddress, _type: Uln302ConfigType): Promise<Uln302UlnConfig> {
        try {
            const config: OAppUlnConfig =
                _type === 'send'
                    ? await this.getUln().getOAppSendUlnConfig(_address, _eid)
                    : await this.getUln().getOAppReceiveUlnConfig(_address, _eid)
            return this.toUlnConfig(config.ulnConfig)
        } catch (error) {
            // If the config doesn't exist, return empty config
            if (this.isMissingSuiConfig(error)) {
                return this.toUlnConfig({
                    confirmations: 0n,
                    requiredDvns: [],
                    optionalDvns: [],
                    optionalDvnThreshold: 0,
                })
            }
            throw error
        }
    }

    async hasAppUlnConfig(
        _eid: EndpointId,
        _oapp: OmniAddress,
        _config: Uln302UlnUserConfig,
        _type: Uln302ConfigType
    ): Promise<boolean> {
        const current = await this.getAppUlnConfig(_eid, _oapp, _type)
        const required = {
            confirmations: _config.confirmations ?? current.confirmations,
            requiredDVNs: _config.requiredDVNs,
            optionalDVNs: _config.optionalDVNs ?? [],
            optionalDVNThreshold: _config.optionalDVNThreshold ?? 0,
        }
        return (
            current.confirmations === required.confirmations &&
            this.equalStringArrays(current.requiredDVNs, required.requiredDVNs) &&
            this.equalStringArrays(current.optionalDVNs, required.optionalDVNs) &&
            current.optionalDVNThreshold === required.optionalDVNThreshold
        )
    }

    async setDefaultUlnConfig(_eid: EndpointId, _config: Uln302UlnUserConfig): Promise<OmniTransaction> {
        const tx = new Transaction()
        const ulnConfig: UlnConfig = {
            confirmations: _config.confirmations ?? 0n,
            requiredDvns: _config.requiredDVNs,
            optionalDvns: _config.optionalDVNs ?? [],
            optionalDvnThreshold: _config.optionalDVNThreshold ?? 0,
        }
        this.getUln().setDefaultSendUlnConfigMoveCall(tx, _eid, ulnConfig)
        this.getUln().setDefaultReceiveUlnConfigMoveCall(tx, _eid, ulnConfig)
        return this.createTransaction(tx)
    }

    async getExecutorConfig(
        _eid: EndpointId,
        _address?: OmniAddress | null | undefined
    ): Promise<Uln302ExecutorConfig> {
        const config = _address
            ? await this.getUln().getEffectiveExecutorConfig(_address, _eid)
            : await this.getUln().getDefaultExecutorConfig(_eid)
        return {
            maxMessageSize: Number(config.maxMessageSize),
            executor: config.executor,
        }
    }

    async getAppExecutorConfig(_eid: EndpointId, _address: OmniAddress): Promise<Uln302ExecutorConfig> {
        try {
            const config = await this.getUln().getOAppExecutorConfig(_address, _eid)
            return {
                maxMessageSize: Number(config.maxMessageSize),
                executor: config.executor,
            }
        } catch (error) {
            // If the config doesn't exist, return empty config
            if (this.isMissingSuiConfig(error)) {
                return {
                    maxMessageSize: 0,
                    executor: '',
                }
            }
            throw error
        }
    }

    async hasAppExecutorConfig(_eid: EndpointId, _oapp: OmniAddress, _config: Uln302ExecutorConfig): Promise<boolean> {
        const current = await this.getAppExecutorConfig(_eid, _oapp)
        return current.maxMessageSize === _config.maxMessageSize && current.executor === _config.executor
    }

    async setDefaultExecutorConfig(_eid: EndpointId, _config: Uln302ExecutorConfig): Promise<OmniTransaction> {
        const tx = new Transaction()
        const executorConfig: ExecutorConfig = {
            maxMessageSize: _config.maxMessageSize,
            executor: _config.executor,
        }
        this.getUln().setDefaultExecutorConfigMoveCall(tx, _eid, executorConfig)
        return this.createTransaction(tx)
    }

    private notImplemented(method: string): never {
        throw new TypeError(`${method}() not implemented on Sui ULN302 SDK`)
    }

    private getSdk(): SDK {
        if (!this.sdk) {
            const stage = endpointIdToStage(this.point.eid) as Stage
            this.sdk = new SDK({ client: this.client, stage })
        }
        return this.sdk
    }

    private getUln(): SuiUln302 {
        if (!this.uln) {
            this.uln = this.getSdk().getUln302()
        }
        return this.uln
    }

    private toUlnConfig(config: UlnConfig): Uln302UlnConfig {
        return {
            confirmations: BigInt(config.confirmations),
            requiredDVNs: config.requiredDvns,
            requiredDVNCount: config.requiredDvns.length,
            optionalDVNs: config.optionalDvns,
            optionalDVNThreshold: config.optionalDvnThreshold,
        }
    }

    private equalStringArrays(left: string[], right: string[]): boolean {
        if (left.length !== right.length) {
            return false
        }
        const sortedLeft = [...left].sort()
        const sortedRight = [...right].sort()
        return sortedLeft.every((value, index) => value === sortedRight[index])
    }

    private isMissingSuiConfig(error: unknown): boolean {
        const message =
            typeof error === 'string'
                ? error.toLowerCase()
                : error && typeof error === 'object' && 'message' in error
                  ? String((error as { message?: unknown }).message).toLowerCase()
                  : ''
        if (!message) {
            return false
        }
        // Move abort errors indicate config doesn't exist
        return (
            message.includes('move abort') &&
            (message.includes('send_uln') || message.includes('receive_uln') || message.includes('executor'))
        )
    }
}
