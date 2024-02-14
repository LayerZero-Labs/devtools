import { UIntBigIntSchema } from '@layerzerolabs/devtools'
import type { PriceData } from '@layerzerolabs/protocol-devtools'
import { PriceDataSchema as PriceDataSchemaBase } from '@layerzerolabs/protocol-devtools'
import { z } from 'zod'

/**
 * Schema for parsing an ethers-specific PriceData into a common format
 */
export const PriceDataSchema = PriceDataSchemaBase.extend({
    priceRatio: UIntBigIntSchema,
    gasPriceInUnit: UIntBigIntSchema,
    gasPerByte: UIntBigIntSchema,
}) satisfies z.ZodSchema<PriceData, z.ZodTypeDef, unknown>
