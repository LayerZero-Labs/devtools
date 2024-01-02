import {
    createOmniEdgeHardhatSchema,
    createOmniGraphHardhatSchema,
    createOmniNodeHardhatSchema,
} from '@layerzerolabs/devtools-evm-hardhat'
import { z } from 'zod'
import type { OAppOmniGraphHardhat } from './types'
import { OAppEdgeConfigSchema } from '@layerzerolabs/ua-devtools'

/**
 * Validation schema for OApp configs in hardhat environment.
 *
 * Produces an `OAppOmniGraphHardhat` after successful parsing
 * the user input.
 */
export const OAppOmniGraphHardhatSchema = createOmniGraphHardhatSchema(
    createOmniNodeHardhatSchema(z.unknown()),
    createOmniEdgeHardhatSchema(OAppEdgeConfigSchema.optional())
) satisfies z.ZodSchema<OAppOmniGraphHardhat>
