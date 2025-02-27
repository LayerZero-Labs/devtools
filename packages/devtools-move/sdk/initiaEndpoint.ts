import { EndpointId, getNetworkForChainId } from '@layerzerolabs/lz-definitions'
import { IEndpoint, LibraryTimeoutResponse } from './IEndpoint'
import { bcs, RESTClient } from '@initia/initia.js'

export class InitiaEndpoint implements IEndpoint {
    private rest: RESTClient
    private endpoint_address: string

    constructor(rest: RESTClient, endpoint_address: string) {
        this.rest = rest
        this.endpoint_address = endpoint_address
    }

    async getDefaultSendLibrary(eid: EndpointId): Promise<string> {
        const result = await this.rest.move.viewFunction<string>(
            this.endpoint_address,
            'endpoint',
            'get_default_send_library',
            [],
            [bcs.u32().serialize(eid).toBase64()]
        )
        return result
    }

    async getSendLibrary(oftAddress: string, dstEid: number): Promise<[string, boolean]> {
        try {
            const result = await this.rest.move.viewFunction<string[]>(
                this.endpoint_address,
                'endpoint',
                'get_effective_send_library',
                [],
                [bcs.address().serialize(oftAddress).toBase64(), bcs.u32().serialize(dstEid).toBase64()]
            )
            return [result[0], result[1] as unknown as boolean]
        } catch (error) {
            const toNetwork = getNetworkForChainId(dstEid)
            throw new Error(
                `Failed to get send library. Wiring to ${toNetwork.chainName}-${toNetwork.env} may not currently be supported for this pathway.`
            )
        }
    }

    async getReceiveLibrary(oftAddress: string, dstEid: number): Promise<[string, boolean]> {
        try {
            const result = await this.rest.move.viewFunction<string[]>(
                this.endpoint_address,
                'endpoint',
                'get_effective_receive_library',
                [],
                [bcs.address().serialize(oftAddress).toBase64(), bcs.u32().serialize(dstEid).toBase64()]
            )
            return [result[0], result[1] as unknown as boolean]
        } catch (error) {
            const toNetwork = getNetworkForChainId(dstEid)
            throw new Error(
                `Failed to get receive library. Wiring to ${toNetwork.chainName}-${toNetwork.env} may not currently be supported for this pathway.`
            )
        }
    }

    async getDefaultReceiveLibraryTimeout(eid: EndpointId): Promise<LibraryTimeoutResponse> {
        const result = await this.rest.move.viewFunction<string[]>(
            this.endpoint_address,
            'endpoint',
            'get_default_receive_library_timeout',
            [],
            [bcs.u32().serialize(eid).toBase64()]
        )
        return {
            expiry: BigInt(result[0]),
            lib: result[1],
        }
    }

    async getReceiveLibraryTimeout(oftAddress: string, dstEid: number): Promise<LibraryTimeoutResponse> {
        try {
            const result = await this.rest.move.viewFunction<string[]>(
                this.endpoint_address,
                'endpoint',
                'get_receive_library_timeout',
                [],
                [bcs.address().serialize(oftAddress).toBase64(), bcs.u32().serialize(dstEid).toBase64()]
            )
            return {
                expiry: BigInt(result[0]),
                lib: result[1],
            }
        } catch (error) {
            return { expiry: BigInt(-1), lib: '' }
        }
    }

    async getDefaultReceiveLibrary(eid: EndpointId): Promise<string> {
        const result = await this.rest.move.viewFunction<string>(
            this.endpoint_address,
            'endpoint',
            'get_default_receive_library',
            [],
            [bcs.u32().serialize(eid).toBase64()]
        )
        return result
    }

    async getConfig(
        oAppAddress: string,
        msgLibAddress: string,
        eid: EndpointId,
        configType: number
    ): Promise<Uint8Array> {
        try {
            const result = await this.rest.move.viewFunction<string>(
                this.endpoint_address,
                'endpoint',
                'get_config',
                [],
                [
                    bcs.address().serialize(oAppAddress).toBase64(),
                    bcs.address().serialize(msgLibAddress).toBase64(),
                    bcs.u32().serialize(eid).toBase64(),
                    bcs.u32().serialize(configType).toBase64(),
                ]
            )
            if (typeof result === 'string') {
                // Remove '0x' prefix if present and convert to buffer
                const cleanHex = result.replace(/^0x/, '')
                const bufferedResult = new Uint8Array(Buffer.from(cleanHex, 'hex'))
                return bufferedResult
            }
            return new Uint8Array(Buffer.from(result, 'base64'))
        } catch (error) {
            throw new Error(
                `Failed to get config for Message Library: ${msgLibAddress} on ${getNetworkForChainId(eid).chainName}. Please ensure that the Message Library exists.`
            )
        }
    }
}
