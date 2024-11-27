import { Aptos } from '@aptos-labs/ts-sdk'
import { EndpointId } from '@layerzerolabs/lz-definitions'
export class Endpoint {
    private aptos: Aptos
    private endpoint_address: string
    constructor(aptos: Aptos, endpoint_address: string) {
        this.aptos = aptos
        this.endpoint_address = endpoint_address
    }

    // TODO: what is the correct address of endpoint_v2?
    async getDefaultSendLibrary(eid: EndpointId) {
        const result = await this.aptos.view({
            payload: {
                // function: `${this.endpoint_address}::endpoint_v2::get_default_send_lib`,
                function:
                    '0xd9fbd5191a9864742464950e4e850786b60d26b1349dcc2227de294c7b2b32c5::endpoint_v2::get_default_send_lib',
                functionArguments: [eid],
            },
        })
        return result
    }

    async getDefaultReceiveLibrary(eid: EndpointId) {
        const result = await this.aptos.view({
            payload: {
                function: `${this.endpoint_address}::endpoint_v2::get_default_receive_lib`,
                functionArguments: [eid],
            },
        })
        return result
    }
}
