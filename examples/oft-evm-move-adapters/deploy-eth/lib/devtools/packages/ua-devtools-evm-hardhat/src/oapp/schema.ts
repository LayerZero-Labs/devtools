import {
    createOmniEdgeHardhatSchema,
    createOmniGraphHardhatSchema,
    createOmniNodeHardhatSchema,
} from '@layerzerolabs/devtools-evm-hardhat'
import { z } from 'zod'
import type { OAppOmniGraphHardhat } from './types'
import { OAppEdgeConfigSchema, OAppNodeConfigSchema } from '@layerzerolabs/ua-devtools'

/**
 * Validation schema for OApp configs in hardhat environment.
 *
 * Produces an `OAppOmniGraphHardhat` after successful parsing
 * the user input.
 */
export const OAppOmniGraphHardhatSchema = createOmniGraphHardhatSchema(
    createOmniNodeHardhatSchema(OAppNodeConfigSchema.optional()),
    createOmniEdgeHardhatSchema(OAppEdgeConfigSchema.optional())
) satisfies z.ZodSchema<OAppOmniGraphHardhat, z.ZodTypeDef, unknown>
