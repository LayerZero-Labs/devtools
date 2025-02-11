import { EndpointId, getNetworkForChainId } from '@layerzerolabs/lz-definitions'
import { IEndpoint, LibraryTimeoutResponse } from './IEndpoint'
import { bcs, RESTClient } from '@initia/initia.js'

type ViewFunctionResult = {
    type: string
    value: string[]
}

export class InitiaEndpoint implements IEndpoint {
    private rest: RESTClient
    private endpoint_address: string

    constructor(rest: RESTClient, endpoint_address: string) {
        this.rest = rest
        this.endpoint_address = endpoint_address
    }

    async getDefaultSendLibrary(eid: EndpointId): Promise<string> {
        const result = (await this.rest.move.viewFunction(
            this.endpoint_address,
            'endpoint',
            'get_default_send_library',
            [],
            [bcs.u32().serialize(eid).toBase64()]
        )) as ViewFunctionResult

        return bcs.string().parse(Buffer.from(result.value[0], 'base64'))
    }

    async getSendLibrary(oftAddress: string, dstEid: number): Promise<[string, boolean]> {
        try {
            const result = (await this.rest.move.viewFunction(
                this.endpoint_address,
                'endpoint',
                'get_effective_send_library',
                [],
                [bcs.address().serialize(oftAddress).toBase64(), bcs.u32().serialize(dstEid).toBase64()]
            )) as ViewFunctionResult

            return [
                bcs.string().parse(Buffer.from(result.value[0], 'base64')),
                bcs.bool().parse(Buffer.from(result.value[1], 'base64')),
            ]
        } catch (error) {
            const toNetwork = getNetworkForChainId(dstEid)
            throw new Error(
                `Failed to get send library. Network: ${toNetwork.chainName}-${toNetwork.env} might not be supported.`
            )
        }
    }

    async getReceiveLibrary(oftAddress: string, dstEid: number): Promise<[string, boolean]> {
        const result = (await this.rest.move.viewFunction(
            this.endpoint_address,
            'endpoint',
            'get_effective_receive_library',
            [],
            [bcs.address().serialize(oftAddress).toBase64(), bcs.u32().serialize(dstEid).toBase64()]
        )) as ViewFunctionResult

        return [
            bcs.string().parse(Buffer.from(result.value[0], 'base64')),
            bcs.bool().parse(Buffer.from(result.value[1], 'base64')),
        ]
    }

    async getDefaultReceiveLibraryTimeout(eid: EndpointId): Promise<LibraryTimeoutResponse> {
        const result = (await this.rest.move.viewFunction(
            this.endpoint_address,
            'endpoint',
            'get_default_receive_library_timeout',
            [],
            [bcs.u32().serialize(eid).toBase64()]
        )) as ViewFunctionResult

        return {
            expiry: BigInt(bcs.u64().parse(Buffer.from(result.value[0], 'base64'))),
            lib: bcs.string().parse(Buffer.from(result.value[1], 'base64')),
        }
    }

    async getReceiveLibraryTimeout(oftAddress: string, dstEid: number): Promise<LibraryTimeoutResponse> {
        try {
            const result = (await this.rest.move.viewFunction(
                this.endpoint_address,
                'endpoint',
                'get_receive_library_timeout',
                [],
                [bcs.address().serialize(oftAddress).toBase64(), bcs.u32().serialize(dstEid).toBase64()]
            )) as ViewFunctionResult

            return {
                expiry: BigInt(bcs.u64().parse(Buffer.from(result.value[0], 'base64'))),
                lib: bcs.string().parse(Buffer.from(result.value[1], 'base64')),
            }
        } catch (error) {
            return { expiry: BigInt(-1), lib: '' }
        }
    }

    async getDefaultReceiveLibrary(eid: EndpointId): Promise<string> {
        const result = (await this.rest.move.viewFunction(
            this.endpoint_address,
            'endpoint',
            'get_default_receive_library',
            [],
            [bcs.u32().serialize(eid).toBase64()]
        )) as ViewFunctionResult

        return bcs.string().parse(Buffer.from(result.value[0], 'base64'))
    }

    async getConfig(
        oAppAddress: string,
        msgLibAddress: string,
        eid: EndpointId,
        configType: number
    ): Promise<Uint8Array> {
        try {
            const result = (await this.rest.move.viewFunction(
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
            )) as ViewFunctionResult

            return Buffer.from(result.value[0], 'base64')
        } catch (error) {
            throw new Error(
                `Failed to get config for Message Library: ${msgLibAddress} on ${getNetworkForChainId(eid).chainName}. Please ensure that the Message Library exists.`
            )
        }
    }
}
