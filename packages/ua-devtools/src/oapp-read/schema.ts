import { z } from 'zod'
import {
    AddressSchema,
    createOmniEdgeSchema,
    createOmniGraphSchema,
    createOmniNodeSchema,
    UIntNumberSchema,
} from '@layerzerolabs/devtools'
import { UlnReadUlnUserConfigSchema } from '@layerzerolabs/protocol-devtools'
import { ExecutorLzReadOption, OAppReadNodeConfig, OAppReadChannelConfig, OAppReadEnforcedOption } from './types'
import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities'
import { OwnableNodeConfigSchema } from '@/ownable/schema'
import { ExecutorComposeOptionSchema, ExecutorOrderedExecutionOptionSchema, OAppEdgeConfigSchema } from '@/oapp'

export const ExecutorLzReadOptionSchema = z.object({
    msgType: UIntNumberSchema,
    optionType: z.literal(ExecutorOptionType.LZ_READ),
    gas: UIntNumberSchema,
    size: UIntNumberSchema,
    value: UIntNumberSchema.optional(),
}) satisfies z.ZodSchema<ExecutorLzReadOption, z.ZodTypeDef, unknown>

export const OAppReadEnforcedOptionConfigSchema = z.union([
    ExecutorLzReadOptionSchema,
    ExecutorComposeOptionSchema,
    ExecutorOrderedExecutionOptionSchema,
]) satisfies z.ZodSchema<OAppReadEnforcedOption, z.ZodTypeDef, unknown>

export const OAppReadChannelConfigSchema = z.object({
    channelId: UIntNumberSchema,
    active: z.boolean().optional(),
    readLibrary: AddressSchema.optional(),
    ulnConfig: UlnReadUlnUserConfigSchema.optional(),
    enforcedOptions: z.array(OAppReadEnforcedOptionConfigSchema).optional(),
}) satisfies z.ZodSchema<OAppReadChannelConfig, z.ZodTypeDef, unknown>

export const OAppReadChannelSchema = z.array(OAppReadChannelConfigSchema) satisfies z.ZodSchema<
    OAppReadChannelConfig[],
    z.ZodTypeDef,
    unknown
>

export const OAppReadNodeConfigSchema = OwnableNodeConfigSchema.extend({
    delegate: AddressSchema.nullish(),
    readChannelConfigs: z.array(OAppReadChannelConfigSchema).optional(),
})
    // We'll pass all unknown properties through without validating them
    .passthrough() satisfies z.ZodSchema<OAppReadNodeConfig, z.ZodTypeDef, unknown>

export const OAppReadOmniGraphSchema = createOmniGraphSchema(
    createOmniNodeSchema(OAppReadNodeConfigSchema),
    createOmniEdgeSchema(OAppEdgeConfigSchema)
)
