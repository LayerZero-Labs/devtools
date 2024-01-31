import { z } from 'zod'
import { AddressSchema, UIntBigIntSchema } from '@layerzerolabs/devtools'
import { Uln302ExecutorConfigSchema, Uln302UlnConfigSchema, TimeoutSchema } from '@layerzerolabs/protocol-devtools'
import {
    OAppEdgeConfig,
    OAppEnforcedOptionConfig,
    OAppReceiveConfig,
    OAppReceiveLibraryConfig,
    OAppSendConfig,
} from './types'

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

export const OAppEnforcedOptionSchema = z.object({
    msgType: z.number(),
    options: z.string(),
}) satisfies z.ZodSchema<OAppEnforcedOptionConfig, z.ZodTypeDef, unknown>

export const OAppEnforcedOptionsSchema = z.array(OAppEnforcedOptionSchema) satisfies z.ZodSchema<
    OAppEnforcedOptionConfig[],
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
