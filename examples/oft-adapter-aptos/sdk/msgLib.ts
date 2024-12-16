import { Aptos } from '@aptos-labs/ts-sdk'

import { EndpointId } from '@layerzerolabs/lz-definitions-v3'

interface MoveVectorResponse {
    vec: UlnConfig[]
}

interface UlnConfig {
    confirmations: bigint
    optional_dvn_threshold: number
    optional_dvns: string[]
    required_dvns: string[]
    use_default_for_confirmations: boolean
    use_default_for_optional_dvns: boolean
    use_default_for_required_dvns: boolean
}

export class MsgLib {
    private aptos: Aptos
    private msgLibAddress: string
    constructor(aptos: Aptos, msgLibAddress: string) {
        this.aptos = aptos
        this.msgLibAddress = msgLibAddress
    }

    async get_default_uln_send_config(eid: EndpointId): Promise<UlnConfig> {
        const result = await this.aptos.view({
            payload: {
                function: `${this.msgLibAddress}::msglib::get_default_uln_send_config`,
                functionArguments: [eid],
            },
        })
        return (result[0] as MoveVectorResponse).vec[0]
    }

    async get_default_uln_receive_config(eid: EndpointId): Promise<UlnConfig> {
        const result = await this.aptos.view({
            payload: {
                function: `${this.msgLibAddress}::msglib::get_default_uln_receive_config`,
                functionArguments: [eid],
            },
        })
        return (result[0] as MoveVectorResponse).vec[0]
    }
}
