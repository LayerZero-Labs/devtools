import { Deserializer, Serializer } from '@layerzerolabs/lz-serdes'
import { addressToBytes32, trim0x } from '@layerzerolabs/lz-v2-utilities'

// A value used to indicate that no DVNs are required. It has to be used instead of 0, because 0 falls back to default value.
const NIL_DVN_COUNT = (1 << 8) - 1 // type(uint8).max = 255

/**
 * Interface representing the limits.
 */
export interface OftLimit {
    /**
     * The minimum amount in LD (local decimals).
     */
    min_amount_ld: bigint

    /**
     * The maximum amount in LD (local decimals).
     */
    max_amount_ld: bigint
}

/**
 * Interface representing the fee details.
 */
export interface OftFeeDetail {
    /**
     * The fee amount in LD (local decimals).
     */
    fee_amount_ld: bigint

    /**
     * Indicates if the fee is a reward.
     */
    is_reward: boolean

    /**
     * The description of the fee.
     */
    description: string
}

/**
 * Enum representing the message types.
 * Refer to aptos_contracts/bridge_remote/sources/internal_woft/woft_core.move
 */
export enum MessageType {
    /**
     * Message type for a message that does not contain a compose message
     */
    SEND = 1,
    /**
     * Message type for a message that contains a compose message
     */
    SEND_AND_CALL = 2,
}

/**
 * Enum representing the config types.
 * Refer to packages/layerzero-v2/aptos/contracts/msglib/libs/uln_302/sources/internal/configuration.move (in monorepo)
 */
export enum ConfigType {
    CONFIG_TYPE_EXECUTOR = 1,
    CONFIG_TYPE_SEND_ULN = 2,
    CONFIG_TYPE_RECV_ULN = 3,
}

/**
 * Interface representing the Byte32.
 * Refer to packages/layerzero-v2/aptos/contracts/endpoint_v2_common/sources/bytes32.move (in monorepo)
 */
export interface Byte32 {
    bytes: Uint8Array
}

/**
 * Interface representing the ULN configuration.
 * Refer to packages/layerzero-v2/aptos/contracts/msglib/msglib_types/sources/configs_uln.move (in monorepo)
 */
export interface UlnConfig {
    /**
     * The number of confirmations.
     */
    confirmations: bigint
    /**
     * The optional DVN threshold.
     */
    optional_dvn_threshold: number
    /**
     * The required DVNs.
     */
    required_dvns: string[]
    /**
     * The optional DVNs.
     */
    optional_dvns: string[]
    /**
     * Whether to use the default for confirmations.
     */
    use_default_for_confirmations: boolean
    /**
     * Whether to use the default for required DVNs.
     */
    use_default_for_required_dvns: boolean
    /**
     * Whether to use the default for optional DVNs.
     */
    use_default_for_optional_dvns: boolean
}

export const UlnConfig = {
    isUlnConfig(obj: any): obj is UlnConfig {
        return (
            typeof obj === 'object' &&
            obj !== null &&
            typeof obj.confirmations === 'bigint' &&
            typeof obj.optional_dvn_threshold === 'number' &&
            Array.isArray(obj.required_dvns) &&
            obj.required_dvns.every((item: any) => typeof item === 'string') &&
            Array.isArray(obj.optional_dvns) &&
            obj.optional_dvns.every((item: any) => typeof item === 'string') &&
            typeof obj.use_default_for_confirmations === 'boolean' &&
            typeof obj.use_default_for_required_dvns === 'boolean' &&
            typeof obj.use_default_for_optional_dvns === 'boolean'
        )
    },

    serialize(obj: UlnConfig): Uint8Array {
        const serializer = new Serializer(false)
        serializer.serializeU64(obj.confirmations)
        serializer.serializeU8(obj.optional_dvn_threshold)
        const requiredDVNCount = obj.required_dvns.length > 0 ? obj.required_dvns.length : NIL_DVN_COUNT
        serializer.serializeU8(requiredDVNCount)
        for (const item of obj.required_dvns) {
            serializer.serializeFixedBytes(addressToBytes32(item))
        }
        const optionalDVNCount = obj.optional_dvns.length
        serializer.serializeU8(optionalDVNCount)
        for (const item of obj.optional_dvns) {
            serializer.serializeFixedBytes(addressToBytes32(item))
        }
        serializer.serializeBool(obj.use_default_for_confirmations)
        serializer.serializeBool(obj.use_default_for_required_dvns)
        serializer.serializeBool(obj.use_default_for_optional_dvns)
        return serializer.getBytes()
    },

    deserialize(data: string | Uint8Array): UlnConfig {
        if (typeof data === 'string') {
            data = Uint8Array.from(Buffer.from(trim0x(data), 'hex'))
        }
        const deserializer = new Deserializer(data, false)
        const confirmations = deserializer.deserializeU64()
        const optional_dvn_threshold = deserializer.deserializeU8()
        const requiredDVNCount = deserializer.deserializeU8()
        const required_dvns: string[] = []
        for (let i = 0; i < requiredDVNCount; i++) {
            required_dvns.push('0x' + Buffer.from(deserializer.deserializeFixedBytes(32)).toString('hex'))
        }
        const optionalDVNCount = deserializer.deserializeU8()
        const optional_dvns: string[] = []
        for (let i = 0; i < optionalDVNCount; i++) {
            optional_dvns.push('0x' + Buffer.from(deserializer.deserializeFixedBytes(32)).toString('hex'))
        }
        const use_default_for_confirmations = deserializer.deserializeBool()
        const use_default_for_required_dvns = deserializer.deserializeBool()
        const use_default_for_optional_dvns = deserializer.deserializeBool()
        return {
            confirmations,
            optional_dvn_threshold,
            required_dvns,
            optional_dvns,
            use_default_for_confirmations,
            use_default_for_required_dvns,
            use_default_for_optional_dvns,
        }
    },
}

/**
 * Interface representing the executor configuration.
 * Refer to packages/layerzero-v2/aptos/contracts/msglib/msglib_types/sources/configs_executor.move (in monorepo)
 */
export interface ExecutorConfig {
    /**
     * The maximum message size.
     */
    max_message_size: number
    /**
     * The executor address.
     */
    executor_address: string
}

export const ExecutorConfig = {
    isExecutorConfig(obj: any): obj is ExecutorConfig {
        return (
            typeof obj === 'object' &&
            obj !== null &&
            typeof obj.max_message_size === 'number' &&
            typeof obj.executor_address === 'string'
        )
    },

    serialize(obj: ExecutorConfig): Uint8Array {
        const serializer = new Serializer(false)

        serializer.serializeU32(obj.max_message_size)

        const addressBytes = addressToBytes32(obj.executor_address)
        serializer.serializeFixedBytes(addressBytes)

        const finalBytes = serializer.getBytes()
        return finalBytes
    },

    deserialize(data: string | Uint8Array): ExecutorConfig {
        if (typeof data === 'string') {
            data = Uint8Array.from(Buffer.from(trim0x(data), 'hex'))
        }
        const deserializer = new Deserializer(data, false)
        const max_message_size = deserializer.deserializeU32()
        const executor_address = Buffer.from(deserializer.deserializeFixedBytes(32)).toString('hex')
        return { max_message_size, executor_address }
    },
}
