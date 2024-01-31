import { z } from 'zod'
import type { DVNDstConfig } from './types'
import { UIntBigIntSchema } from '@layerzerolabs/devtools'

export const DVNDstConfigSchema = z.object({
    gas: UIntBigIntSchema,
    multiplierBps: UIntBigIntSchema,
    floorMarginUSD: UIntBigIntSchema,
}) satisfies z.ZodSchema<DVNDstConfig, z.ZodTypeDef, unknown>
