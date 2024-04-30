import {
    createOmniEdgeHardhatSchema,
    createOmniGraphHardhatSchema,
    createOmniNodeHardhatSchema,
} from '@layerzerolabs/devtools-evm-hardhat'
import { z } from 'zod'
import type { OwnableOmniGraphHardhat } from './types'
import { OwnableNodeConfigSchema } from '@layerzerolabs/ua-devtools'

/**
 * Validation schema for Ownable configs in hardhat environment.
 *
 * Produces an `OwnableOmniGraphHardhat` after successful parsing
 * of the user input.
 */
export const OwnableOmniGraphHardhatSchema = createOmniGraphHardhatSchema(
    createOmniNodeHardhatSchema(OwnableNodeConfigSchema),
    createOmniEdgeHardhatSchema(z.unknown())
) satisfies z.ZodSchema<OwnableOmniGraphHardhat, z.ZodTypeDef, unknown>
