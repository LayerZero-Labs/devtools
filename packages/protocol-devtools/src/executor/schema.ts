import { z } from 'zod'
import type { ExecutorDstConfig } from './types'
import { UIntBigIntSchema } from '@layerzerolabs/devtools'

export const ExecutorDstConfigSchema = z.object({
    baseGas: UIntBigIntSchema,
    multiplierBps: UIntBigIntSchema,
    floorMarginUSD: UIntBigIntSchema,
    nativeCap: UIntBigIntSchema,
}) satisfies z.ZodSchema<ExecutorDstConfig, z.ZodTypeDef, unknown>
