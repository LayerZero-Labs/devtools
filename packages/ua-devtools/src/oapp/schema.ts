import { z } from 'zod'
import { AddressSchema, UIntBigIntSchema, UIntNumberSchema } from '@layerzerolabs/devtools'
import { Uln302ExecutorConfigSchema, Uln302UlnConfigSchema, TimeoutSchema } from '@layerzerolabs/protocol-devtools'
import {
    ExecutorComposeOption,
    ExecutorLzReceiveOption,
    ExecutorNativeDropOption,
    ExecutorOrderedExecutionOption,
    OAppEdgeConfig,
    OAppEnforcedOption,
    OAppReceiveConfig,
    OAppReceiveLibraryConfig,
    OAppSendConfig,
} from './types'
import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities'

export const OAppReceiveLibraryConfigSchema = z.object({
    gracePeriod: UIntBigIntSchema,
    receiveLibrary: AddressSchema,
}) satisfies z.ZodSchema<OAppReceiveLibraryConfig, z.ZodTypeDef, unknown>

export const OAppSendConfigSchema = z.object({
    executorConfig: Uln302ExecutorConfigSchema,
    ulnConfig: Uln302UlnConfigSchema,
}) satisfies z.ZodSchema<OAppSendConfig, z.ZodTypeDef, unknown>

export const OAppReceiveConfigSchema = z.object({
    ulnConfig: Uln302UlnConfigSchema,
}) satisfies z.ZodSchema<OAppReceiveConfig, z.ZodTypeDef, unknown>

export const ExecutorLzReceiveOptionSchema = z.object({
    msgType: z.literal(ExecutorOptionType.LZ_RECEIVE),
    gas: UIntNumberSchema,
    value: UIntNumberSchema,
}) satisfies z.ZodSchema<ExecutorLzReceiveOption, z.ZodTypeDef, unknown>

export const ExecutorNativeDropOptionSchema = z.object({
    msgType: z.literal(ExecutorOptionType.NATIVE_DROP),
    amount: UIntNumberSchema,
    receiver: AddressSchema,
}) satisfies z.ZodSchema<ExecutorNativeDropOption, z.ZodTypeDef, unknown>

export const ExecutorComposeOptionSchema = z.object({
    msgType: z.literal(ExecutorOptionType.COMPOSE),
    index: UIntNumberSchema,
    gas: UIntNumberSchema,
    value: UIntNumberSchema,
}) satisfies z.ZodSchema<ExecutorComposeOption, z.ZodTypeDef, unknown>

export const ExecutorOrderedExecutionOptionSchema = z.object({
    msgType: z.literal(ExecutorOptionType.ORDERED),
}) satisfies z.ZodSchema<ExecutorOrderedExecutionOption, z.ZodTypeDef, unknown>

export const OAppEnforcedOptionConfigSchema = z.union([
    ExecutorLzReceiveOptionSchema,
    ExecutorNativeDropOptionSchema,
    ExecutorComposeOptionSchema,
    ExecutorOrderedExecutionOptionSchema,
]) satisfies z.ZodSchema<OAppEnforcedOption, z.ZodTypeDef, unknown>

export const OAppEnforcedOptionsSchema = z.array(OAppEnforcedOptionConfigSchema) satisfies z.ZodSchema<
    OAppEnforcedOption[],
    z.ZodTypeDef,
    unknown
>

export const OAppEdgeConfigSchema = z
    .object({
        sendLibrary: AddressSchema,
        receiveLibraryConfig: OAppReceiveLibraryConfigSchema,
        receiveLibraryTimeoutConfig: TimeoutSchema,
        sendConfig: OAppSendConfigSchema,
        receiveConfig: OAppReceiveConfigSchema,
        enforcedOptions: OAppEnforcedOptionsSchema,
    })
    .partial() satisfies z.ZodSchema<OAppEdgeConfig, z.ZodTypeDef, unknown>
