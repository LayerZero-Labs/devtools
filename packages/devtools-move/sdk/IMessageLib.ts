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
    getDefaultULNSendConfig(eid: EndpointId): Promise<UlnConfig>
    getDefaultULNReceiveConfig(eid: EndpointId): Promise<UlnConfig>
    getDefaultExecutorConfig(eid: EndpointId): Promise<ExecutorConfigResponse>
}
