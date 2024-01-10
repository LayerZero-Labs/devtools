import { BigNumberishBigintSchema } from '@layerzerolabs/devtools-evm'
import type { ExecutorDstConfig } from '@layerzerolabs/protocol-devtools'
import { ExecutorDstConfigSchema as ExecutorDstConfigSchemaBase } from '@layerzerolabs/protocol-devtools'
import { z } from 'zod'

/**
 * Schema for parsing an ethers-specific PriceData into a common format
 */
export const ExecutorDstConfigSchema = ExecutorDstConfigSchemaBase.extend({
    baseGas: BigNumberishBigintSchema,
    multiplierBps: BigNumberishBigintSchema,
    floorMarginUSD: BigNumberishBigintSchema,
    nativeCap: BigNumberishBigintSchema,
}) satisfies z.ZodSchema<ExecutorDstConfig, z.ZodTypeDef, unknown>
