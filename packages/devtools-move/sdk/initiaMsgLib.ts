import { EndpointId } from '@layerzerolabs/lz-definitions'
import { IMessageLib, UlnConfig } from './IMessageLib'
import { ExecutorConfig } from '../tasks/move/utils'
import { bcs, RESTClient } from '@initia/initia.js'

type ViewFunctionResult = {
    type: string
    value: string[]
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

export class InitiaMsgLib implements IMessageLib {
    private msgLibAddress: string
    private restClient: RESTClient

    constructor(moveVMConnection: RESTClient, msgLibAddress: string) {
        this.msgLibAddress = msgLibAddress
        this.restClient = moveVMConnection
    }

    async get_default_uln_send_config(eid: EndpointId): Promise<UlnConfig> {
        try {
            const result = (await this.restClient.move.viewFunction(
                this.msgLibAddress,
                'msglib',
                'get_default_uln_send_config',
                [],
                [bcs.u32().serialize(eid).toBase64()]
            )) as ViewFunctionResult

            if (!result.value || result.value.length === 0) {
                return DEFAULT_ULN_CONFIG
            }

            const rawConfig = {
                confirmations: bcs.u64().parse(Buffer.from(result.value[0], 'base64')),
                optional_dvn_threshold: bcs.u8().parse(Buffer.from(result.value[1], 'base64')),
                optional_dvns: bcs.vector(bcs.string()).parse(Buffer.from(result.value[2], 'base64')),
                required_dvns: bcs.vector(bcs.string()).parse(Buffer.from(result.value[3], 'base64')),
                use_default_for_confirmations: bcs.bool().parse(Buffer.from(result.value[4], 'base64')),
                use_default_for_optional_dvns: bcs.bool().parse(Buffer.from(result.value[5], 'base64')),
                use_default_for_required_dvns: bcs.bool().parse(Buffer.from(result.value[6], 'base64')),
            }

            return {
                ...rawConfig,
                confirmations: BigInt(rawConfig.confirmations),
                optional_dvns: rawConfig.optional_dvns.map(String),
                required_dvns: rawConfig.required_dvns.map(String),
            }
        } catch (error) {
            return DEFAULT_ULN_CONFIG
        }
    }

    async get_default_uln_receive_config(eid: EndpointId): Promise<UlnConfig> {
        try {
            const result = (await this.restClient.move.viewFunction(
                this.msgLibAddress,
                'msglib',
                'get_default_uln_receive_config',
                [],
                [bcs.u32().serialize(eid).toBase64()]
            )) as ViewFunctionResult

            if (!result.value || result.value.length === 0) {
                return DEFAULT_ULN_CONFIG
            }

            const rawConfig = {
                confirmations: bcs.u64().parse(Buffer.from(result.value[0], 'base64')),
                optional_dvn_threshold: bcs.u8().parse(Buffer.from(result.value[1], 'base64')),
                optional_dvns: bcs.vector(bcs.string()).parse(Buffer.from(result.value[2], 'base64')),
                required_dvns: bcs.vector(bcs.string()).parse(Buffer.from(result.value[3], 'base64')),
                use_default_for_confirmations: bcs.bool().parse(Buffer.from(result.value[4], 'base64')),
                use_default_for_optional_dvns: bcs.bool().parse(Buffer.from(result.value[5], 'base64')),
                use_default_for_required_dvns: bcs.bool().parse(Buffer.from(result.value[6], 'base64')),
            }

            return {
                ...rawConfig,
                confirmations: BigInt(rawConfig.confirmations),
                optional_dvns: rawConfig.optional_dvns.map(String),
                required_dvns: rawConfig.required_dvns.map(String),
            }
        } catch (error) {
            return DEFAULT_ULN_CONFIG
        }
    }

    async get_default_executor_config(eid: EndpointId): Promise<ExecutorConfig> {
        try {
            const result = (await this.restClient.move.viewFunction(
                this.msgLibAddress,
                'msglib',
                'get_default_executor_config',
                [],
                [bcs.u32().serialize(eid).toBase64()]
            )) as ViewFunctionResult

            if (!result.value || result.value.length === 0) {
                return DEFAULT_EXECUTOR_CONFIG
            }

            return {
                executor_address: bcs.string().parse(Buffer.from(result.value[0], 'base64')),
                max_message_size: Number(bcs.u64().parse(Buffer.from(result.value[1], 'base64'))),
            }
        } catch (error) {
            return DEFAULT_EXECUTOR_CONFIG
        }
    }
}
