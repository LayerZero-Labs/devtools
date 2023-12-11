import type { IEndpoint } from '@layerzerolabs/protocol-utils'
import { formatEid, type Address, type OmniTransaction } from '@layerzerolabs/utils'
import type { EndpointId } from '@layerzerolabs/lz-definitions'
import { ignoreZero, makeZeroAddress, OmniSDK } from '@layerzerolabs/utils-evm'

export class Endpoint extends OmniSDK implements IEndpoint {
    async getDefaultReceiveLibrary(eid: EndpointId): Promise<string | undefined> {
        return ignoreZero(await this.contract.contract.defaultReceiveLibrary(eid))
    }

    async getSendLibrary(sender: Address, dstEid: EndpointId): Promise<string | undefined> {
        return ignoreZero(await this.contract.contract.getSendLibrary(sender, dstEid))
    }

    async getReceiveLibrary(receiver: Address, srcEid: EndpointId): Promise<[string | undefined, boolean]> {
        return await this.contract.contract.getReceiveLibrary(receiver, srcEid)
    }

    async setDefaultReceiveLibrary(
        eid: EndpointId,
        lib: string | null | undefined,
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

    async getDefaultSendLibrary(eid: EndpointId): Promise<string | undefined> {
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

    async registerLibrary(lib: string): Promise<OmniTransaction> {
        const data = this.contract.contract.interface.encodeFunctionData('registerLibrary', [lib])

        return {
            ...this.createTransaction(data),
            description: `Registering library ${lib}`,
        }
    }
}
