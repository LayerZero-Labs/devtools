import { AddressSchema } from '@layerzerolabs/utils'
import { BigNumberishNumberSchema } from '@layerzerolabs/utils-evm'
import { BigNumberishBigintSchema } from '@layerzerolabs/utils-evm'
import { z } from 'zod'

/**
 * Schema for parsing an ethers-specific UlnConfig into a common format
 */
export const Uln302UlnConfigSchema = z.object({
    confirmations: BigNumberishBigintSchema,
    requiredDVNs: z.array(AddressSchema),
    optionalDVNs: z.array(AddressSchema),
    optionalDVNThreshold: z.coerce.number().int().nonnegative(),
})

/**
 * Schema for parsing an ethers-specific ExecutorConfig into a common format
 */
export const Uln302ExecutorConfigSchema = z.object({
    maxMessageSize: BigNumberishNumberSchema,
    executor: AddressSchema,
})

/**
 * Schema for parsing a common UlnConfig into a ethers-specific format
 */
export const Uln302UlnConfigInputSchema = Uln302UlnConfigSchema.transform((config) => ({
    ...config,
    confirmations: String(config.confirmations),
    requiredDVNCount: config.requiredDVNs.length,
    optionalDVNCount: config.optionalDVNs.length,
}))
