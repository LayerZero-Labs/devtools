import { AddressSchema, UIntSchema } from '@layerzerolabs/devtools'
import { z } from 'zod'
import { Uln302ExecutorConfig, Uln302UlnConfig } from './types'

export const Uln302ExecutorConfigSchema = z.object({
    executor: AddressSchema,
    maxMessageSize: UIntSchema,
}) satisfies z.ZodSchema<Uln302ExecutorConfig, z.ZodTypeDef, unknown>

export const Uln302UlnConfigSchema = z.object({
    confirmations: UIntSchema,
    requiredDVNs: z.array(AddressSchema),
    optionalDVNs: z.array(AddressSchema),
    optionalDVNThreshold: UIntSchema,
}) satisfies z.ZodSchema<Uln302UlnConfig, z.ZodTypeDef, unknown>
