import { ExecutorConfig } from '../tasks/move/utils'
import { Aptos } from '@aptos-labs/ts-sdk'

import { EndpointId } from '@layerzerolabs/lz-definitions'

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

interface ExecutorConfigResponse {
    executor_address: string
    max_message_size: number
}

interface MoveVectorExecutorResponse {
    vec: ExecutorConfigResponse[]
}

const DEFAULT_ULN_CONFIG: UlnConfig = {
    confirmations: BigInt(0),
    optional_dvn_threshold: 0,
    optional_dvns: [],
    required_dvns: [],
    use_default_for_confirmations: true,
    use_default_for_optional_dvns: true,
    use_default_for_required_dvns: true,
}

const DEFAULT_EXECUTOR_CONFIG: ExecutorConfig = {
    executor_address: '',
    max_message_size: -1,
}

export class MsgLib {
    private aptos: Aptos
    private msgLibAddress: string
    constructor(aptos: Aptos, msgLibAddress: string) {
        this.aptos = aptos
        this.msgLibAddress = msgLibAddress
    }

    async get_default_uln_send_config(eid: EndpointId): Promise<UlnConfig> {
        try {
            const result = await this.aptos.view({
                payload: {
                    function: `${this.msgLibAddress}::msglib::get_default_uln_send_config`,
                    functionArguments: [eid],
                },
            })
            const rawConfig = (result[0] as MoveVectorResponse)?.vec[0]
            if (!rawConfig) {
                return DEFAULT_ULN_CONFIG
            }
            return {
                ...rawConfig,
                confirmations: BigInt(rawConfig.confirmations),
                optional_dvns: rawConfig.optional_dvns.map(String),
                required_dvns: rawConfig.required_dvns.map(String),
                optional_dvn_threshold: Number(rawConfig.optional_dvn_threshold),
            }
        } catch (error) {
            return DEFAULT_ULN_CONFIG
        }
    }

    async get_default_uln_receive_config(eid: EndpointId): Promise<UlnConfig> {
        try {
            const result = await this.aptos.view({
                payload: {
                    function: `${this.msgLibAddress}::msglib::get_default_uln_receive_config`,
                    functionArguments: [eid],
                },
            })
            const rawConfig = (result[0] as MoveVectorResponse)?.vec[0]
            if (!rawConfig) {
                return DEFAULT_ULN_CONFIG
            }
            return {
                ...rawConfig,
                confirmations: BigInt(rawConfig.confirmations),
                optional_dvns: rawConfig.optional_dvns.map(String),
                required_dvns: rawConfig.required_dvns.map(String),
                optional_dvn_threshold: Number(rawConfig.optional_dvn_threshold),
            }
        } catch (error) {
            return DEFAULT_ULN_CONFIG
        }
    }

    async get_default_executor_config(eid: EndpointId): Promise<ExecutorConfig> {
        try {
            const result = await this.aptos.view({
                payload: {
                    function: `${this.msgLibAddress}::msglib::get_default_executor_config`,
                    functionArguments: [eid],
                },
            })
            const rawConfig = (result[0] as MoveVectorExecutorResponse)?.vec[0]
            if (!rawConfig) {
                // In the case where we don't find a default executor config, we return an empty config
                return DEFAULT_EXECUTOR_CONFIG
            }
            return {
                executor_address: String(rawConfig.executor_address),
                max_message_size: Number(rawConfig.max_message_size),
            }
        } catch (error) {
            // In the case where we don't find a executor config, we return an empty config
            return DEFAULT_EXECUTOR_CONFIG
        }
    }
}
