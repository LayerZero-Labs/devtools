import { AddressSchema, UIntNumberSchema } from '@layerzerolabs/devtools'
import { z } from 'zod'
import { UlnReadUlnConfig, UlnReadUlnUserConfig } from './types'

export const UlnReadUlnConfigSchema = z.object({
    executor: AddressSchema,
    requiredDVNs: z.array(AddressSchema),
    requiredDVNCount: UIntNumberSchema,
    optionalDVNs: z.array(AddressSchema),
    optionalDVNCount: UIntNumberSchema,
    optionalDVNThreshold: UIntNumberSchema,
}) satisfies z.ZodSchema<UlnReadUlnConfig, z.ZodTypeDef, unknown>

export const UlnReadUlnUserConfigSchema = z.object({
    executor: AddressSchema.optional(),
    requiredDVNs: z.array(AddressSchema).optional(),
    optionalDVNs: z.array(AddressSchema).optional(),
    optionalDVNThreshold: UIntNumberSchema.optional(),
}) satisfies z.ZodSchema<UlnReadUlnUserConfig, z.ZodTypeDef, unknown>
