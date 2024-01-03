import { EndpointId } from '@layerzerolabs/lz-definitions'
import { z } from 'zod'
import type { OmniPoint, OmniNode, OmniVector, OmniEdge, OmniGraph } from './types'

export const UIntSchema = z.coerce.number().nonnegative().int()

export const AddressSchema = z.string()

export const EndpointIdSchema: z.ZodSchema<EndpointId, z.ZodTypeDef, string | number> = z
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

export const EmptyOmniNodeSchema = z.object({
    point: OmniPointSchema,
    config: z.unknown().optional(),
})

export const EmptyOmniEdgeSchema = z.object({
    vector: OmniVectorSchema,
    config: z.unknown().optional(),
})

/**
 * Helper assertion utility for `OmniPoint` instances
 *
 * @param {unknown} value
 * @returns {boolean} `true` if the value is an `OmniPoint`, `false` otherwise
 */
export const isOmniPoint = (value: unknown): value is OmniPoint => OmniPointSchema.safeParse(value).success

/**
 * Helper assertion utility that checks whether an `OmniGraph`
 * has at least any contracts or connections defined
 *
 * @param {OmniGraph} graph
 * @returns {boolean}
 */
export const isOmniGraphEmpty = ({ contracts, connections }: OmniGraph): boolean =>
    contracts.length === 0 && connections.length === 0

/**
 * Factory for OmniNode schemas
 *
 * @param configSchema Schema of the config contained in the node
 *
 * @returns `z.ZodSchema<OmniNode<TConfig>>` schema for a node with the particular config type
 */
export const createOmniNodeSchema = <TConfig = unknown>(
    configSchema: z.ZodSchema<TConfig, z.ZodTypeDef, unknown>
): z.ZodSchema<OmniNode<TConfig>, z.ZodTypeDef> =>
    EmptyOmniNodeSchema.extend({
        config: configSchema,
    }) as z.ZodSchema<OmniNode<TConfig>, z.ZodTypeDef>

/**
 * Factory for OmniEdge schemas
 *
 * @param {z.ZodSchema<TConfig>} configSchema Schema of the config contained in the edge
 *
 * @returns {z.ZodSchema<OmniEdge<TConfig>>} Schema for an edge with the particular config type
 */
export const createOmniEdgeSchema = <TConfig = unknown>(
    configSchema: z.ZodSchema<TConfig, z.ZodTypeDef, unknown>
): z.ZodSchema<OmniEdge<TConfig>, z.ZodTypeDef> =>
    EmptyOmniEdgeSchema.extend({
        config: configSchema,
    }) as z.ZodSchema<OmniEdge<TConfig>, z.ZodTypeDef>

/**
 * Factory for OmniGraph schemas
 *
 * @param {z.ZodSchema<OmniNode<TNodeConfig>, z.ZodTypeDef, unknown>} nodeSchema
 * @param {z.ZodSchema<OmniEdge<TEdgeConfig>, z.ZodTypeDef, unknown>} edgeSchema
 *
 * @returns {z.ZodSchema<OmniGraph<TNodeConfig, TEdgeConfig>, z.ZodTypeDef, unknown>}
 */
export const createOmniGraphSchema = <TNodeConfig = unknown, TEdgeConfig = unknown>(
    nodeSchema: z.ZodSchema<OmniNode<TNodeConfig>, z.ZodTypeDef, unknown>,
    edgeSchema: z.ZodSchema<OmniEdge<TEdgeConfig>, z.ZodTypeDef, unknown>
): z.ZodSchema<OmniGraph<TNodeConfig, TEdgeConfig>, z.ZodTypeDef, unknown> =>
    z.object({
        contracts: z.array(nodeSchema),
        connections: z.array(edgeSchema),
    })
