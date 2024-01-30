import { AddressSchema, UIntBigIntSchema, UIntNumberSchema } from '@layerzerolabs/devtools'
import { z } from 'zod'
import { Uln302ExecutorConfig, Uln302UlnConfig } from './types'

export const Uln302ExecutorConfigSchema = z.object({
    executor: AddressSchema,
    maxMessageSize: UIntNumberSchema,
}) satisfies z.ZodSchema<Uln302ExecutorConfig, z.ZodTypeDef, unknown>

export const Uln302UlnConfigSchema = z.object({
    confirmations: UIntBigIntSchema,
    requiredDVNs: z.array(AddressSchema),
    optionalDVNs: z.array(AddressSchema),
    optionalDVNThreshold: UIntNumberSchema,
}) satisfies z.ZodSchema<Uln302UlnConfig, z.ZodTypeDef, unknown>
