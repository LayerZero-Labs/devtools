import assert from 'assert'
import type { IEndpoint, IUln302, Uln302Factory } from '@layerzerolabs/protocol-utils'
import { formatEid, type Address, type OmniTransaction, formatOmniPoint, OmniPoint } from '@layerzerolabs/utils'
import type { EndpointId } from '@layerzerolabs/lz-definitions'
import { ignoreZero, isZero, makeZeroAddress, type OmniContract, OmniSDK } from '@layerzerolabs/utils-evm'

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
