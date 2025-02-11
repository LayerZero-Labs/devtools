import { EndpointId } from '@layerzerolabs/lz-definitions'

export interface UlnConfig {
    confirmations: bigint
    optional_dvn_threshold: number
    optional_dvns: string[]
    required_dvns: string[]
    use_default_for_confirmations: boolean
    use_default_for_optional_dvns: boolean
    use_default_for_required_dvns: boolean
}

export interface ExecutorConfigResponse {
    executor_address: string
    max_message_size: number
}

export interface MoveVectorResponse {
    vec: UlnConfig[]
}

export interface MoveVectorExecutorResponse {
    vec: ExecutorConfigResponse[]
}

export interface IMessageLib {
    get_default_uln_send_config(eid: EndpointId): Promise<UlnConfig>
    get_default_uln_receive_config(eid: EndpointId): Promise<UlnConfig>
    get_default_executor_config(eid: EndpointId): Promise<ExecutorConfigResponse>
}
