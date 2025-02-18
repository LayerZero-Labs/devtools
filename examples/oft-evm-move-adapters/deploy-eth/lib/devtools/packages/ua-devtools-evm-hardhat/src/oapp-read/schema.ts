import {
    createOmniEdgeHardhatSchema,
    createOmniGraphHardhatSchema,
    createOmniNodeHardhatSchema,
} from '@layerzerolabs/devtools-evm-hardhat'
import { z } from 'zod'
import type { OAppReadOmniGraphHardhat } from './types'
import { OAppEdgeConfigSchema, OAppReadNodeConfigSchema } from '@layerzerolabs/ua-devtools'

/**
 * Validation schema for OAppRead configs in hardhat environment.
 *
 * Produces an `OAppReadOmniGraphHardhat` after successful parsing
 * the user input.
 */
export const OAppReadOmniGraphHardhatSchema = createOmniGraphHardhatSchema(
    createOmniNodeHardhatSchema(OAppReadNodeConfigSchema.optional()),
    createOmniEdgeHardhatSchema(OAppEdgeConfigSchema.optional())
) satisfies z.ZodSchema<OAppReadOmniGraphHardhat, z.ZodTypeDef, unknown>
