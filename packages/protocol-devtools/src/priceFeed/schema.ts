import { z } from 'zod'
import type { PriceData } from './types'
import { UIntSchema } from '@layerzerolabs/devtools'

export const PriceDataSchema = z.object({
    priceRatio: UIntSchema,
    gasPriceInUnit: UIntSchema,
    gasPerByte: UIntSchema,
}) satisfies z.ZodSchema<PriceData, z.ZodTypeDef, unknown>
