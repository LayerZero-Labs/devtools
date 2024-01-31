import { BigNumberishBigIntSchema } from '@layerzerolabs/devtools-evm'
import type { ExecutorDstConfig } from '@layerzerolabs/protocol-devtools'
import { ExecutorDstConfigSchema as ExecutorDstConfigSchemaBase } from '@layerzerolabs/protocol-devtools'
import { z } from 'zod'

/**
 * Schema for parsing an ethers-specific PriceData into a common format
 */
export const ExecutorDstConfigSchema = ExecutorDstConfigSchemaBase.extend({
    baseGas: BigNumberishBigIntSchema,
    multiplierBps: BigNumberishBigIntSchema,
    floorMarginUSD: BigNumberishBigIntSchema,
    nativeCap: BigNumberishBigIntSchema,
}) satisfies z.ZodSchema<ExecutorDstConfig, z.ZodTypeDef, unknown>
