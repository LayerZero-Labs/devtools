import { AddressSchema, UIntSchema } from '@layerzerolabs/devtools'
import { z } from 'zod'
import { Timeout } from './types'

export const TimeoutSchema = z.object({
    lib: AddressSchema,
    expiry: UIntSchema,
}) satisfies z.ZodSchema<Timeout, z.ZodTypeDef, unknown>
