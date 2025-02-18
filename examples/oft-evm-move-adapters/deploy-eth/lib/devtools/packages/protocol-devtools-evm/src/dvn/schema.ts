import { BigNumberishBigIntSchema } from '@layerzerolabs/devtools-evm'
import type { DVNDstConfig } from '@layerzerolabs/protocol-devtools'
import { DVNDstConfigSchema as DVNDstConfigSchemaBase } from '@layerzerolabs/protocol-devtools'
import { z } from 'zod'

/**
 * Schema for parsing an ethers-specific DVN DstConfig into a common format
 */
export const DVNDstConfigSchema = DVNDstConfigSchemaBase.extend({
    gas: BigNumberishBigIntSchema,
    multiplierBps: BigNumberishBigIntSchema,
    floorMarginUSD: BigNumberishBigIntSchema,
}) satisfies z.ZodSchema<DVNDstConfig, z.ZodTypeDef, unknown>
