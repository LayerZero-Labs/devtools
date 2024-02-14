import { z } from 'zod'
import {
    Uln302UlnConfigSchema as Uln302UlnConfigSchemaBase,
    Uln302ExecutorConfigSchema as Uln302ExecutorConfigSchemaBase,
} from '@layerzerolabs/protocol-devtools'
import type { Uln302ExecutorConfig, Uln302UlnConfig } from '@layerzerolabs/protocol-devtools'
import type { Uln302ExecutorConfigInput, Uln302UlnConfigInput } from './types'
import { UIntBigIntSchema, UIntNumberSchema } from '@layerzerolabs/devtools'

/**
 * Schema for parsing an ethers-specific UlnConfig into a common format
 */
export const Uln302UlnConfigSchema = Uln302UlnConfigSchemaBase.extend({
    confirmations: UIntBigIntSchema,
}) satisfies z.ZodSchema<Uln302UlnConfig, z.ZodTypeDef, Uln302UlnConfigInput>

/**
 * Schema for parsing an ethers-specific ExecutorConfig into a common format
 */
export const Uln302ExecutorConfigSchema = Uln302ExecutorConfigSchemaBase.extend({
    maxMessageSize: UIntNumberSchema,
}) satisfies z.ZodSchema<Uln302ExecutorConfig, z.ZodTypeDef, Uln302ExecutorConfigInput>
