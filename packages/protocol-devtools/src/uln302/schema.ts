import { AddressSchema, UIntBigIntSchema, UIntNumberSchema } from '@layerzerolabs/devtools'
import { z } from 'zod'
import { Uln302ExecutorConfig, Uln302UlnConfig, Uln302UlnUserConfig } from './types'

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

export const Uln302UlnUserConfigSchema = z.object({
    confirmations: UIntBigIntSchema.optional(),
    requiredDVNs: z.array(AddressSchema),
    optionalDVNs: z.array(AddressSchema).optional(),
    optionalDVNThreshold: UIntNumberSchema.optional(),
}) satisfies z.ZodSchema<Uln302UlnUserConfig, z.ZodTypeDef, unknown>
