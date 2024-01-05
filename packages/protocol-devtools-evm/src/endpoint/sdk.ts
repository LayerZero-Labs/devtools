import assert from 'assert'
import type {
    IEndpoint,
    IUln302,
    SetConfigParam,
    Uln302ExecutorConfig,
    Uln302Factory,
    Uln302SetUlnConfig,
    Uln302UlnConfig,
} from '@layerzerolabs/protocol-devtools'
import { formatEid, type Address, type OmniTransaction, formatOmniPoint } from '@layerzerolabs/devtools'
import type { EndpointId } from '@layerzerolabs/lz-definitions'
import { ignoreZero, isZero, makeZeroAddress, type OmniContract, OmniSDK } from '@layerzerolabs/devtools-evm'
import { Timeout } from '@layerzerolabs/protocol-devtools'
import { Uln302 } from '@/uln302'
import { Uln302SetExecutorConfig } from '@layerzerolabs/protocol-devtools'

const CONFIG_TYPE_EXECUTOR = 1
const CONFIG_TYPE_ULN = 2

export class Endpoint extends OmniSDK implements IEndpoint {
    constructor(
        contract: OmniContract,
        private readonly uln302Factory: Uln302Factory
    ) {
        super(contract)
    }

    async getUln302SDK(address: Address): Promise<IUln302> {
        assert(
            !isZero(address),
            `Uln302 cannot be instantiated: Uln302 address cannot be a zero value for Endpoint ${formatOmniPoint(
                this.point
            )}`
        )

        return await this.uln302Factory({ eid: this.point.eid, address })
    }

    async getDefaultReceiveLibrary(eid: EndpointId): Promise<Address | undefined> {
        return ignoreZero(await this.contract.contract.defaultReceiveLibrary(eid))
    }

    async getSendLibrary(sender: Address, dstEid: EndpointId): Promise<Address | undefined> {
        return ignoreZero(await this.contract.contract.getSendLibrary(sender, dstEid))
    }

    async getReceiveLibrary(
        receiver: Address,
        srcEid: EndpointId
    ): Promise<[address: Address | undefined, isDefault: boolean]> {
        return await this.contract.contract.getReceiveLibrary(receiver, srcEid)
    }

    async setDefaultReceiveLibrary(
        eid: EndpointId,
        lib: Address | null | undefined,
        gracePeriod: number = 0
    ): Promise<OmniTransaction> {
        const data = this.contract.contract.interface.encodeFunctionData('setDefaultReceiveLibrary', [
            eid,
            makeZeroAddress(lib),
            gracePeriod,
        ])

        return {
            ...this.createTransaction(data),
            description: `Setting default receive library for ${formatEid(eid)} to ${makeZeroAddress(lib)}`,
        }
    }

    async getDefaultSendLibrary(eid: EndpointId): Promise<Address | undefined> {
        return ignoreZero(await this.contract.contract.defaultSendLibrary(eid))
    }

    async setDefaultSendLibrary(eid: EndpointId, lib: Address | null | undefined): Promise<OmniTransaction> {
        const data = this.contract.contract.interface.encodeFunctionData('setDefaultSendLibrary', [
            eid,
            makeZeroAddress(lib),
        ])

        return {
            ...this.createTransaction(data),
            description: `Setting default send library for ${formatEid(eid)} to ${lib}`,
        }
    }

    async getDefaultReceiveLibraryTimeout(eid: EndpointId): Promise<Timeout> {
        return await this.contract.contract.defaultReceiveLibraryTimeout(eid)
    }

    async setSendLibrary(oapp: Address, eid: EndpointId, newLib: Address | null | undefined): Promise<OmniTransaction> {
        const data = this.contract.contract.interface.encodeFunctionData('setSendLibrary', [oapp, eid, newLib])

        return {
            ...this.createTransaction(data),
            description: `Setting send library for ${formatEid(eid)} to ${newLib}`,
        }
    }

    async setReceiveLibrary(
        oapp: Address,
        eid: EndpointId,
        newLib: Address | null | undefined,
        gracePeriod: number
    ): Promise<OmniTransaction> {
        const data = this.contract.contract.interface.encodeFunctionData('setReceiveLibrary', [
            oapp,
            eid,
            newLib,
            gracePeriod,
        ])

        return {
            ...this.createTransaction(data),
            description: `Setting receive library for ${formatEid(eid)} to ${newLib} with grace period ${gracePeriod}`,
        }
    }

    async setReceiveLibraryTimeout(
        oapp: Address,
        eid: EndpointId,
        lib: Address | null | undefined,
        expiry: number
    ): Promise<OmniTransaction> {
        const data = this.contract.contract.interface.encodeFunctionData('setReceiveLibraryTimeout', [
            oapp,
            eid,
            lib,
            expiry,
        ])

        return {
            ...this.createTransaction(data),
            description: `Setting receive library timeout for ${formatEid(
                eid
            )} to ${lib} with expiration period ${expiry}`,
        }
    }

    async getReceiveLibraryTimeout(receiver: Address, srcEid: EndpointId): Promise<Timeout> {
        return await this.contract.contract.receiveLibraryTimeout(receiver, srcEid)
    }

    async setUlnConfig(oapp: Address, lib: Address, setUlnConfig: Uln302SetUlnConfig[]): Promise<OmniTransaction> {
        const uln = (await this.getUln302SDK(lib)) as Uln302
        const setConfigParams: SetConfigParam[] = setUlnConfig.map(({ eid, ulnConfig }) => ({
            eid,
            configType: CONFIG_TYPE_ULN,
            config: uln.encodeUlnConfig(ulnConfig),
        }))

        const data = this.contract.contract.interface.encodeFunctionData('setConfig', [oapp, lib, setConfigParams])
        return {
            ...this.createTransaction(data),
            description: `Set UlnConfig Config for lib: ${lib}`,
        }
    }

    async setExecutorConfig(
        oapp: Address,
        lib: Address,
        setExecutorConfig: Uln302SetExecutorConfig[]
    ): Promise<OmniTransaction> {
        const uln = (await this.getUln302SDK(lib)) as Uln302
        const setConfigParams: SetConfigParam[] = setExecutorConfig.map(({ eid, executorConfig }) => ({
            eid,
            configType: CONFIG_TYPE_EXECUTOR,
            config: uln.encodeExecutorConfig(executorConfig),
        }))

        const data = this.contract.contract.interface.encodeFunctionData('setConfig', [oapp, lib, setConfigParams])
        return {
            ...this.createTransaction(data),
            description: `Set Executor Config for lib: ${lib}`,
        }
    }

    async getExecutorConfig(oapp: Address, lib: Address, eid: EndpointId): Promise<Uln302ExecutorConfig> {
        const uln = await this.getUln302SDK(lib)
        return await uln.getExecutorConfig(eid, oapp)
    }

    async getUlnConfig(oapp: Address, lib: Address, eid: EndpointId): Promise<Uln302UlnConfig> {
        const uln = await this.getUln302SDK(lib)
        return await uln.getUlnConfig(eid, oapp)
    }

    isRegisteredLibrary(lib: Address): Promise<boolean> {
        return this.contract.contract.isRegisteredLibrary(lib)
    }

    async registerLibrary(lib: Address): Promise<OmniTransaction> {
        const data = this.contract.contract.interface.encodeFunctionData('registerLibrary', [lib])

        return {
            ...this.createTransaction(data),
            description: `Registering library ${lib}`,
        }
    }
}
