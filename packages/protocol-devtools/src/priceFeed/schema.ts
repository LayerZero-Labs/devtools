import { z } from 'zod'
import type { PriceData } from './types'
import { UIntBigIntSchema } from '@layerzerolabs/devtools'

export const PriceDataSchema = z.object({
    priceRatio: UIntBigIntSchema,
    gasPriceInUnit: UIntBigIntSchema,
    gasPerByte: UIntBigIntSchema,
}) satisfies z.ZodSchema<PriceData, z.ZodTypeDef, unknown>
