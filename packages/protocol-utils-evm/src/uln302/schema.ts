import { z } from 'zod'
import { AddressSchema } from '@layerzerolabs/utils'
import { BigNumberishNumberSchema } from '@layerzerolabs/utils-evm'
import { BigNumberishBigintSchema } from '@layerzerolabs/utils-evm'
import type { Uln302ExecutorConfig, Uln302UlnConfig } from '@layerzerolabs/protocol-utils'
import type { Uln302ExecutorConfigInput, Uln302UlnConfigInput } from './types'

/**
 * Schema for parsing an ethers-specific UlnConfig into a common format
 */
export const Uln302UlnConfigSchema = z.object({
    confirmations: BigNumberishBigintSchema,
    requiredDVNs: z.array(AddressSchema),
    optionalDVNs: z.array(AddressSchema),
    optionalDVNThreshold: z.coerce.number().int().nonnegative(),
}) satisfies z.ZodSchema<Uln302UlnConfig, z.ZodTypeDef, Uln302UlnConfigInput>

/**
 * Schema for parsing an ethers-specific ExecutorConfig into a common format
 */
export const Uln302ExecutorConfigSchema = z.object({
    maxMessageSize: BigNumberishNumberSchema,
    executor: AddressSchema,
}) satisfies z.ZodSchema<Uln302ExecutorConfig, z.ZodTypeDef, Uln302ExecutorConfigInput>

/**
 * Schema for parsing a common UlnConfig into a ethers-specific format
 */
export const Uln302UlnConfigInputSchema = Uln302UlnConfigSchema.transform((config) => ({
    ...config,
    confirmations: String(config.confirmations),
    requiredDVNCount: config.requiredDVNs.length,
    optionalDVNCount: config.optionalDVNs.length,
}))
