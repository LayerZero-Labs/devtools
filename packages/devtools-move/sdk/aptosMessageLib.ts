import { ExecutorConfig } from '../tasks/move/utils'
import { Aptos } from '@aptos-labs/ts-sdk'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { IMessageLib, UlnConfig, MoveVectorResponse, MoveVectorExecutorResponse } from './IMessageLib'

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

export class AptosMsgLib implements IMessageLib {
    private moveVMConnection: Aptos
    private msgLibAddress: string

    constructor(moveVMConnection: Aptos, msgLibAddress: string) {
        this.moveVMConnection = moveVMConnection
        this.msgLibAddress = msgLibAddress
    }

    async get_default_uln_send_config(eid: EndpointId): Promise<UlnConfig> {
        try {
            const result = await this.moveVMConnection.view({
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
            const result = await this.moveVMConnection.view({
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
            const result = await this.moveVMConnection.view({
                payload: {
                    function: `${this.msgLibAddress}::msglib::get_default_executor_config`,
                    functionArguments: [eid],
                },
            })
            const rawConfig = (result[0] as MoveVectorExecutorResponse)?.vec[0]
            if (!rawConfig) {
                return DEFAULT_EXECUTOR_CONFIG
            }
            return {
                executor_address: String(rawConfig.executor_address),
                max_message_size: Number(rawConfig.max_message_size),
            }
        } catch (error) {
            return DEFAULT_EXECUTOR_CONFIG
        }
    }
}
