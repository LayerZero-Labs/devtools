import assert from 'assert'
import type {
    IEndpoint,
    IUln302,
    SetConfigParam,
    Uln302ExecutorConfig,
    Uln302Factory,
    Uln302UlnConfig,
} from '@layerzerolabs/protocol-utils'
import { formatEid, type Address, type OmniTransaction, formatOmniPoint } from '@layerzerolabs/utils'
import type { EndpointId } from '@layerzerolabs/lz-definitions'
import { ignoreZero, isZero, makeZeroAddress, type OmniContract, OmniSDK } from '@layerzerolabs/utils-evm'
import { Timeout, CONFIG_TYPE_EXECUTOR, CONFIG_TYPE_ULN } from '@layerzerolabs/protocol-utils'
import { defaultAbiCoder } from '@ethersproject/abi'

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

    async setSendLibrary(eid: EndpointId, newLib: Address | null | undefined): Promise<OmniTransaction> {
        const data = this.contract.contract.interface.encodeFunctionData('setSendLibrary', [eid, newLib])

        return {
            ...this.createTransaction(data),
            description: `Setting send library for ${formatEid(eid)} to ${newLib}`,
        }
    }

    async setReceiveLibrary(
        eid: EndpointId,
        newLib: Address | null | undefined,
        gracePeriod: number
    ): Promise<OmniTransaction> {
        const data = this.contract.contract.interface.encodeFunctionData('setReceiveLibrary', [
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
        eid: EndpointId,
        lib: Address | null | undefined,
        expiry: number
    ): Promise<OmniTransaction> {
        const data = this.contract.contract.interface.encodeFunctionData('setReceiveLibraryTimeout', [eid, lib, expiry])

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

    async setConfig(lib: Address, params: SetConfigParam[]): Promise<OmniTransaction> {
        const data = this.contract.contract.interface.encodeFunctionData('setConfig', [lib, params])

        console.log({ params })

        let description: string = ''
        for (const param of params) {
            description += `Setting ${
                param.configType === CONFIG_TYPE_EXECUTOR ? 'executor' : 'uln'
            } config for endpoint ${formatEid(param.eid)}. `
        }

        return {
            ...this.createTransaction(data),
            description: description,
        }
    }

    async getConfig(
        oapp: Address,
        lib: Address,
        eid: EndpointId,
        configType: number
    ): Promise<Uln302ExecutorConfig | Uln302UlnConfig> {
        assert(
            configType === CONFIG_TYPE_EXECUTOR || configType === CONFIG_TYPE_ULN,
            `configType invalid ${configType}`
        )
        if (configType === CONFIG_TYPE_EXECUTOR) {
            const encodedExecutorBytes = await this.contract.contract.getConfig(oapp, lib, eid, configType)
            const [maxMessageSize, executor] = defaultAbiCoder.decode(['uint32', 'address'], encodedExecutorBytes)
            return { maxMessageSize, executor }
        } else {
            const encodedUlnBytes = await this.contract.contract.getConfig(oapp, lib, eid, configType)
            const [
                confirmations,
                requiredDVNCount,
                optionalDVNCount,
                optionalDVNThreshold,
                requiredDVNs,
                optionalDVNs,
            ] = defaultAbiCoder.decode(['tuple(uint64,uint8,uint8,uint8,address[],address[])'], encodedUlnBytes)
            return { confirmations, optionalDVNThreshold, requiredDVNs, optionalDVNs }
        }
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
