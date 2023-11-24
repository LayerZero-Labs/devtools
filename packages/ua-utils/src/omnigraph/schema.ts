import { EndpointId } from '@layerzerolabs/lz-definitions'
import { z } from 'zod'
import type { OmniPoint, OmniNode, OmniVector, OmniEdge } from './types'

export const AddressSchema = z.string()

export const EndpointIdSchema: z.ZodSchema<EndpointId, z.ZodTypeDef, unknown> = z
    .nativeEnum(EndpointId)
    .pipe(z.number())

export const OmniPointSchema: z.ZodSchema<OmniPoint, z.ZodTypeDef, unknown> = z.object({
    address: AddressSchema,
    eid: EndpointIdSchema,
})

export const OmniVectorSchema: z.ZodSchema<OmniVector, z.ZodTypeDef, unknown> = z.object({
    from: OmniPointSchema,
    to: OmniPointSchema,
})

/**
 * Factory for OmniNode schemas
 *
 * @param configSchema Schema of the config contained in the node
 *
 * @returns `z.ZodSchema<OmniNode<TConfig>>` schema for a node with the particular config type
 */
export const createOmniNodeSchema = <TConfig = unknown>(
    configSchema: z.ZodSchema<TConfig, z.ZodTypeDef, unknown>
): z.ZodSchema<OmniNode<TConfig>, z.ZodTypeDef, unknown> =>
    z.object({
        point: OmniPointSchema,
        config: configSchema,
    }) as z.ZodSchema<OmniNode<TConfig>, z.ZodTypeDef, unknown>

/**
 * Factory for OmniEdge schemas
 *
 * @param configSchema `z.ZodSchema<TConfig>` Schema of the config contained in the edge
 *
 * @returns `z.ZodSchema<OmniEdge<TConfig>>` schema for an edge with the particular config type
 */
export const createOmniEdgeSchema = <TConfig = unknown>(
    configSchema: z.ZodSchema<TConfig, z.ZodTypeDef, unknown>
): z.ZodSchema<OmniEdge<TConfig>, z.ZodTypeDef, unknown> =>
    z.object({
        vector: OmniVectorSchema,
        config: configSchema,
    }) as z.ZodSchema<OmniEdge<TConfig>, z.ZodTypeDef, unknown>
