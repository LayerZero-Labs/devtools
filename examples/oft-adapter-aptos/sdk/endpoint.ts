import { Aptos } from '@aptos-labs/ts-sdk'

import { EndpointId, getNetworkForChainId } from '@layerzerolabs/lz-definitions-v3'

interface LibraryTimeoutResponse {
    expiry: bigint
    lib: string
}

export class Endpoint {
    private aptos: Aptos
    private endpoint_address: string
    constructor(aptos: Aptos, endpoint_address: string) {
        this.aptos = aptos
        this.endpoint_address = endpoint_address
    }

    async getDefaultSendLibrary(eid: EndpointId): Promise<string> {
        const result = await this.aptos.view({
            payload: {
                function: `${this.endpoint_address}::endpoint::get_default_send_lib`,
                functionArguments: [eid],
            },
        })
        return result[0] as string
    }

    async getSendLibrary(oftAddress: string, dstEid: number): Promise<[string, boolean]> {
        try {
            const result = await this.aptos.view({
                payload: {
                    function: `${this.endpoint_address}::endpoint::get_effective_send_library`,
                    functionArguments: [oftAddress, dstEid],
                },
            })
            return [result[0] as string, result[1] as boolean]
        } catch (error) {
            const toNetwork = getNetworkForChainId(dstEid)
            throw new Error(
                `Failed to get send library. Network: ${toNetwork.chainName}-${toNetwork.env} might not be supported.`
            )
        }
    }

    async getReceiveLibrary(oftAddress: string, dstEid: number): Promise<[string, boolean]> {
        const result = await this.aptos.view({
            payload: {
                function: `${this.endpoint_address}::endpoint::get_effective_receive_library`,
                functionArguments: [oftAddress, dstEid],
            },
        })
        return [result[0] as string, result[1] as boolean]
    }

    async getDefaultReceiveLibraryTimeout(eid: EndpointId): Promise<LibraryTimeoutResponse> {
        const result = await this.aptos.view({
            payload: {
                function: `${this.endpoint_address}::endpoint::get_default_receive_library_timeout`,
                functionArguments: [eid],
            },
        })
        return result[0] as LibraryTimeoutResponse
    }

    async getReceiveLibraryTimeout(oftAddress: string, dstEid: number): Promise<LibraryTimeoutResponse> {
        try {
            const result = await this.aptos.view({
                payload: {
                    function: `${this.endpoint_address}::endpoint::get_receive_library_timeout`,
                    functionArguments: [oftAddress, dstEid],
                },
            })
            const rawResponse = result[0] as { expiry: string; lib: string }
            return {
                expiry: BigInt(rawResponse.expiry),
                lib: rawResponse.lib,
            }
        } catch (error) {
            // if the timeout is not set, it will throw a VM error, so we should return and impossible value
            // to always produce a diff when setting the timeout
            return { expiry: BigInt(-1), lib: '' }
        }
    }

    async getDefaultReceiveLibrary(eid: EndpointId): Promise<string> {
        const result = await this.aptos.view({
            payload: {
                function: `${this.endpoint_address}::endpoint::get_default_receive_lib`,
                functionArguments: [eid],
            },
        })
        return result[0] as string
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
