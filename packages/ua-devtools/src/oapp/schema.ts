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

export const OAppEnforcedOptionsSchema = z.array(
    z.object({
        msgType: z.number(),
        options: z.string(),
    })
) satisfies z.ZodSchema<OAppEnforcedOptionConfig[], z.ZodTypeDef, unknown>

export const OAppEdgeConfigSchema = z.object({
    sendLibrary: AddressSchema.optional(),
    receiveLibraryConfig: OAppReceiveLibraryConfigSchema.optional(),
    receiveLibraryTimeoutConfig: TimeoutSchema.optional(),
    sendConfig: OAppSendConfigSchema.optional(),
    receiveConfig: OAppReceiveConfigSchema.optional(),
    enforcedOptions: OAppEnforcedOptionsSchema.optional(),
}) satisfies z.ZodSchema<OAppEdgeConfig, z.ZodTypeDef, unknown>
