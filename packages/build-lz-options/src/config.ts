import type { OptionType } from '@/types'
import { ExecutorOptionType, WorkerId } from '@layerzerolabs/lz-v2-utilities'

/**
 * Supported Option Types.
 */
export const OPTION_TYPES: OptionType[] = [
    {
        // TODO: use OptionType.TYPE_1 once exported from lz-v2-utility
        id: '1',
        label: '1: gas for remote execution',
    },
    {
        // TODO: use OptionType.TYPE_2 once exported from lz-v2-utility
        id: '2',
        label: '2: gas for remote execution and native drop',
    },
    {
        // TODO: use OptionType.TYPE_3 once exported from lz-v2-utility
        id: '3',
        label: '3: options builder (EndpointV2 only)',
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
