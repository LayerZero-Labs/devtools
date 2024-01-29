import { z } from 'zod'
import type { DVNDstConfig } from './types'
import { UIntSchema } from '@layerzerolabs/devtools'

export const DVNDstConfigSchema = z.object({
    gas: UIntSchema,
    multiplierBps: UIntSchema,
    floorMarginUSD: UIntSchema,
}) satisfies z.ZodSchema<DVNDstConfig, z.ZodTypeDef, unknown>
