import type { OptionTypeOption } from '@/types'
import { ExecutorOptionType, OptionType as UtilitiesOptionType, WorkerId } from '@layerzerolabs/lz-v2-utilities'

/**
 * Supported Option Types.
 */
export const OPTION_TYPES: OptionTypeOption[] = [
    {
        id: UtilitiesOptionType.TYPE_1,
        label: `${UtilitiesOptionType.TYPE_1}: gas for remote execution`,
    },
    {
        id: UtilitiesOptionType.TYPE_2,
        label: `${UtilitiesOptionType.TYPE_2}: gas for remote execution and native drop`,
    },
    {
        id: UtilitiesOptionType.TYPE_3,
        label: `${UtilitiesOptionType.TYPE_3}: options builder (EndpointV2 only)`,
    },
]

/**
 * Supported Executor Option Types.
 */
export const EXECUTOR_OPTION_TYPE = [
    {
        id: ExecutorOptionType.LZ_RECEIVE,
        label: '1: lzReceive',
    },
    {
        id: ExecutorOptionType.NATIVE_DROP,
        label: '2: nativeDrop',
    },
    {
        id: ExecutorOptionType.COMPOSE,
        label: '3: compose',
    },
    {
        id: ExecutorOptionType.ORDERED,
        label: '4: ordered',
    },
]

/**
 * Supported Worker Types.
 */
export const WORKER_TYPE = [
    {
        id: WorkerId.EXECUTOR,
        label: '1 Executor',
    },
    {
        id: WorkerId.VERIFIER,
        label: '2 Verifier',
    },
]
