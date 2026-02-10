import type {
    IUln302,
    Uln302ConfigType,
    Uln302ExecutorConfig,
    Uln302UlnConfig,
    Uln302UlnUserConfig,
} from '@layerzerolabs/protocol-devtools'
import type { EndpointId } from '@layerzerolabs/lz-definitions'
import type { OmniAddress, OmniTransaction } from '@layerzerolabs/devtools'
import { areBytes32Equal } from '@layerzerolabs/devtools'
import { OmniSDK } from '@layerzerolabs/devtools-starknet'
import type { Contract } from 'starknet'
import { getUltraLightNodeContractWithAddress } from '../protocol'

export class Uln302 extends OmniSDK implements IUln302 {
    private uln?: Contract

    async getUlnConfig(
        _eid: EndpointId,
        _address: OmniAddress | null | undefined,
        _type: Uln302ConfigType
    ): Promise<Uln302UlnConfig> {
        if (!_address) {
            return this.emptyUlnConfig()
        }
        return this.getAppUlnConfig(_eid, _address, _type)
    }

    async getAppUlnConfig(_eid: EndpointId, _address: OmniAddress, _type: Uln302ConfigType): Promise<Uln302UlnConfig> {
        const uln = await this.getUln()
        const config =
            _type === 'send'
                ? await (uln as any).get_raw_oapp_uln_send_config(_address, _eid)
                : await (uln as any).get_raw_oapp_uln_receive_config(_address, _eid)
        return {
            confirmations: config.has_confirmations ? BigInt(config.confirmations) : 0n,
            requiredDVNs: config.has_required_dvns ? this.normalizeAddressArray(config.required_dvns) : [],
            requiredDVNCount: config.has_required_dvns ? config.required_dvns.length : 0,
            optionalDVNs: config.has_optional_dvns ? this.normalizeAddressArray(config.optional_dvns) : [],
            optionalDVNThreshold: config.has_optional_dvns ? Number(config.optional_dvn_threshold) : 0,
        }
    }

    async hasAppUlnConfig(
        _eid: EndpointId,
        _oapp: OmniAddress,
        _config: Uln302UlnUserConfig,
        _type: Uln302ConfigType
    ): Promise<boolean> {
        const current = await this.getAppUlnConfig(_eid, _oapp, _type)

        const confirmationsMatch = current.confirmations === (_config.confirmations ?? current.confirmations)
        const requiredDvnsMatch = this.equalAddressArrays(current.requiredDVNs, _config.requiredDVNs)
        const optionalDvnsMatch = this.equalAddressArrays(current.optionalDVNs, _config.optionalDVNs ?? [])
        const thresholdMatch = current.optionalDVNThreshold === (_config.optionalDVNThreshold ?? 0)

        return confirmationsMatch && requiredDvnsMatch && optionalDvnsMatch && thresholdMatch
    }

    async setDefaultUlnConfig(_eid: EndpointId, _config: Uln302UlnUserConfig): Promise<OmniTransaction> {
        return this.notImplemented('setDefaultUlnConfig')
    }

    async getExecutorConfig(
        _eid: EndpointId,
        _address?: OmniAddress | null | undefined
    ): Promise<Uln302ExecutorConfig> {
        if (!_address) {
            return { maxMessageSize: 0, executor: '0x0' }
        }
        return this.getAppExecutorConfig(_eid, _address)
    }

    async getAppExecutorConfig(_eid: EndpointId, _address: OmniAddress): Promise<Uln302ExecutorConfig> {
        const uln = await this.getUln()
        const config = await (uln as any).get_raw_oapp_executor_config(_address, _eid)
        return {
            maxMessageSize: Number(config.max_message_size ?? 0),
            executor: this.normalizeAddress(config.executor) ?? '0x0',
        }
    }

    async hasAppExecutorConfig(_eid: EndpointId, _oapp: OmniAddress, _config: Uln302ExecutorConfig): Promise<boolean> {
        const current = await this.getAppExecutorConfig(_eid, _oapp)
        return current.maxMessageSize === _config.maxMessageSize && areBytes32Equal(current.executor, _config.executor)
    }

    async setDefaultExecutorConfig(_eid: EndpointId, _config: Uln302ExecutorConfig): Promise<OmniTransaction> {
        return this.notImplemented('setDefaultExecutorConfig')
    }

    private notImplemented(method: string): never {
        throw new TypeError(`${method}() not implemented on Starknet ULN302 SDK`)
    }

    private async getUln(): Promise<Contract> {
        if (!this.uln) {
            this.uln = await getUltraLightNodeContractWithAddress(this.point.address, this.provider)
        }
        return this.uln!
    }

    private emptyUlnConfig(): Uln302UlnConfig {
        return {
            confirmations: 0n,
            requiredDVNs: [],
            requiredDVNCount: 0,
            optionalDVNs: [],
            optionalDVNThreshold: 0,
        }
    }

    private equalAddressArrays(left: string[], right: string[]): boolean {
        if (left.length !== right.length) {
            return false
        }
        // Use areBytes32Equal for address comparison to handle leading zero differences
        const normalizedLeft = [...left].sort()
        const normalizedRight = [...right].sort()
        return normalizedLeft.every((value, index) => areBytes32Equal(value, normalizedRight[index]))
    }

    private normalizeAddress(value: unknown): string | undefined {
        if (value == null) {
            return undefined
        }
        let hexValue: string | undefined
        if (typeof value === 'string') {
            hexValue = value
        } else if (typeof value === 'bigint') {
            hexValue = `0x${value.toString(16)}`
        }
        // Normalize Starknet felt252 addresses by removing leading zeros after 0x
        if (hexValue) {
            const normalized = hexValue.toLowerCase().replace(/^0x0*/, '0x')
            return normalized === '0x' ? '0x0' : normalized
        }
        return undefined
    }

    private normalizeAddressArray(addresses: unknown[]): string[] {
        return addresses.map((addr) => this.normalizeAddress(addr) ?? '0x0')
    }
}
