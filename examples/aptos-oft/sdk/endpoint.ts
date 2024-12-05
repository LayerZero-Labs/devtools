import { Aptos } from '@aptos-labs/ts-sdk'
import { EndpointId, getNetworkForChainId } from '@layerzerolabs/lz-definitions-v3'
export class Endpoint {
    private aptos: Aptos
    private endpoint_address: string
    constructor(aptos: Aptos, endpoint_address: string) {
        this.aptos = aptos
        this.endpoint_address = endpoint_address
    }

    async getDefaultSendLibrary(eid: EndpointId) {
        return await this.aptos.view({
            payload: {
                function: `${this.endpoint_address}::endpoint::get_default_send_lib`,
                functionArguments: [eid],
            },
        })
    }

    async getSendLibrary(oftAddress: string, dstEid: number) {
        const result = await this.aptos.view({
            payload: {
                function: `${this.endpoint_address}::endpoint::get_effective_send_library`,
                functionArguments: [oftAddress, dstEid],
            },
        })
        return result[0]
    }

    async getReceiveLibrary(oftAddress: string, dstEid: number) {
        const result = await this.aptos.view({
            payload: {
                function: `${this.endpoint_address}::endpoint::get_effective_receive_library`,
                functionArguments: [oftAddress, dstEid],
            },
        })
        return result[0]
    }

    async getReceiveLibraryTimeout(oftAddress: string, dstEid: number) {
        console.log(`oftAddress: ${oftAddress} dstEid: ${dstEid}`)
        const result = await this.aptos.view({
            payload: {
                function: `${this.endpoint_address}::endpoint::get_receive_library_timeout`,
                functionArguments: [oftAddress, dstEid],
            },
        })
        return result[0]
    }

    async getDefaultReceiveLibrary(eid: EndpointId) {
        return await this.aptos.view({
            payload: {
                function: `${this.endpoint_address}::endpoint::get_default_receive_lib`,
                functionArguments: [eid],
            },
        })
    }

    async getConfig(
        oAppAddress: string,
        msgLibAddress: string,
        eid: EndpointId,
        configType: number
    ): Promise<Uint8Array> {
        try {
            const result = await this.aptos.view({
                payload: {
                    function: `${this.endpoint_address}::endpoint::get_config`,
                    functionArguments: [oAppAddress, msgLibAddress, eid, configType],
                },
            })
            return result[0] as Uint8Array
        } catch (error) {
            throw new Error(
                `Failed to get config for Message Library: ${msgLibAddress} on ${getNetworkForChainId(eid).chainName}. Please ensure that the Message Library exists.`
            )
        }
    }
}
