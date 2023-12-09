import {
    createOmniEdgeHardhatSchema,
    createOmniGraphHardhatSchema,
    createOmniNodeHardhatSchema,
} from '@layerzerolabs/utils-evm-hardhat'
import { z } from 'zod'
import type { OAppOmniGraphHardhat } from './types'

/**
 * Validation schema for OApp configs in hardhat environment.
 *
 * Produces an `OAppOmniGraphHardhat` after successful parsing
 * the user input.
 */
export const OAppOmniGraphHardhatSchema = createOmniGraphHardhatSchema(
    createOmniNodeHardhatSchema(z.unknown()),
    createOmniEdgeHardhatSchema(z.unknown())
) satisfies z.ZodSchema<OAppOmniGraphHardhat>
