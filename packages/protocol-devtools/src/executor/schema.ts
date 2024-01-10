import { z } from 'zod'
import type { ExecutorDstConfig } from './types'
import { UIntSchema } from '@layerzerolabs/devtools'

export const ExecutorDstConfigSchema = z.object({
    baseGas: UIntSchema,
    multiplierBps: UIntSchema,
    floorMarginUSD: UIntSchema,
    nativeCap: UIntSchema,
}) satisfies z.ZodSchema<ExecutorDstConfig, z.ZodTypeDef, unknown>
