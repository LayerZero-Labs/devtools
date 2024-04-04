import { BigNumberishBigIntSchema } from '@layerzerolabs/devtools-evm'
import type {
    ExecutorDstConfig,
    ExecutorDstConfigPost2_1_27,
    ExecutorDstConfigPre2_1_27,
} from '@layerzerolabs/protocol-devtools'
import {
    ExecutorDstConfigPre2_1_27Schema as ExecutorDstConfigPre2_1_27SchemaBase,
    ExecutorDstConfigPost2_1_27Schema as ExecutorDstConfigPost2_1_27SchemaBase,
} from '@layerzerolabs/protocol-devtools'
import { z } from 'zod'

/**
 * Schema for parsing an ethers-specific ExecutorDstConfig into a common format
 */
export const ExecutorDstConfigPre2_1_27Schema = ExecutorDstConfigPre2_1_27SchemaBase.extend({
    baseGas: BigNumberishBigIntSchema,
    multiplierBps: BigNumberishBigIntSchema,
    floorMarginUSD: BigNumberishBigIntSchema,
    nativeCap: BigNumberishBigIntSchema,
}) satisfies z.ZodSchema<ExecutorDstConfigPre2_1_27, z.ZodTypeDef, unknown>

/**
 * Schema for parsing an ethers-specific ExecutorDstConfig into a common format
 */
export const ExecutorDstConfigPost2_1_27Schema = ExecutorDstConfigPost2_1_27SchemaBase.extend({
    lzComposeBaseGas: BigNumberishBigIntSchema,
    lzReceiveBaseGas: BigNumberishBigIntSchema,
    multiplierBps: BigNumberishBigIntSchema,
    floorMarginUSD: BigNumberishBigIntSchema,
    nativeCap: BigNumberishBigIntSchema,
}) satisfies z.ZodSchema<ExecutorDstConfigPost2_1_27, z.ZodTypeDef, unknown>

export const ExecutorDstConfigSchema = z.union([
    ExecutorDstConfigPre2_1_27Schema,
    ExecutorDstConfigPost2_1_27Schema,
]) satisfies z.ZodSchema<ExecutorDstConfig, z.ZodTypeDef, unknown>
