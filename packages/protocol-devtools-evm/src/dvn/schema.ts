import { UIntBigIntSchema } from '@layerzerolabs/devtools'
import type { DVNDstConfig } from '@layerzerolabs/protocol-devtools'
import { DVNDstConfigSchema as DVNDstConfigSchemaBase } from '@layerzerolabs/protocol-devtools'
import { z } from 'zod'

/**
 * Schema for parsing an ethers-specific DVN DstConfig into a common format
 */
export const DVNDstConfigSchema = DVNDstConfigSchemaBase.extend({
    gas: UIntBigIntSchema,
    multiplierBps: UIntBigIntSchema,
    floorMarginUSD: UIntBigIntSchema,
}) satisfies z.ZodSchema<DVNDstConfig, z.ZodTypeDef, unknown>
