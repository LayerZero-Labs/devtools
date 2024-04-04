import { z } from 'zod'
import type { ExecutorDstConfig, ExecutorDstConfigPost2_1_27, ExecutorDstConfigPre2_1_27 } from './types'
import { UIntBigIntSchema } from '@layerzerolabs/devtools'

export const ExecutorDstConfigPre2_1_27Schema = z.object({
    baseGas: UIntBigIntSchema,
    multiplierBps: UIntBigIntSchema,
    floorMarginUSD: UIntBigIntSchema,
    nativeCap: UIntBigIntSchema,
}) satisfies z.ZodSchema<ExecutorDstConfigPre2_1_27, z.ZodTypeDef, unknown>

export const ExecutorDstConfigPost2_1_27Schema = z.object({
    lzComposeBaseGas: UIntBigIntSchema,
    lzReceiveBaseGas: UIntBigIntSchema,
    multiplierBps: UIntBigIntSchema,
    floorMarginUSD: UIntBigIntSchema,
    nativeCap: UIntBigIntSchema,
}) satisfies z.ZodSchema<ExecutorDstConfigPost2_1_27, z.ZodTypeDef, unknown>

export const ExecutorDstConfigSchema = z.union([
    ExecutorDstConfigPre2_1_27Schema,
    ExecutorDstConfigPost2_1_27Schema,
]) satisfies z.ZodSchema<ExecutorDstConfig, z.ZodTypeDef, unknown>
