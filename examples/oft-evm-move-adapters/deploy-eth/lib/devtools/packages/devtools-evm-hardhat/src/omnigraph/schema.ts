import { z } from 'zod'
import { EndpointIdSchema, OmniPointSchema } from '@layerzerolabs/devtools'
import type { OmniEdgeHardhat, OmniGraphHardhat, OmniNodeHardhat, OmniPointHardhat, WithContractName } from './types'

export const OmniPointHardhatSchema: z.ZodSchema<OmniPointHardhat, z.ZodTypeDef, unknown> = z.object({
    eid: EndpointIdSchema,
    contractName: z.string().nullish(),
    address: z.string().nullish(),
})

const OmniPointOrOmniPointHardhatSchema = z.union([OmniPointHardhatSchema, OmniPointSchema])

/**
 * Factory for OmniNodeHardhat schemas
 *
 * @param configSchema Schema of the config contained in the node
 *
 * @returns {z.ZodSchema<OmniNodeHardhat<TConfig>>} schema for a node with the particular config type
 */
export const createOmniNodeHardhatSchema = <TConfig = unknown>(
    configSchema: z.ZodSchema<TConfig, z.ZodTypeDef, unknown>
): z.ZodSchema<OmniNodeHardhat<TConfig>, z.ZodTypeDef, unknown> =>
    z.object({
        contract: OmniPointOrOmniPointHardhatSchema,
        config: configSchema,
    }) as z.ZodSchema<OmniNodeHardhat<TConfig>, z.ZodTypeDef>

/**
 * Factory for OmniEdgeHardhat schemas
 *
 * @param {z.ZodSchema<TConfig>} configSchema Schema of the config contained in the edge
 *
 * @returns {z.ZodSchema<OmniEdgeHardhat<TConfig>>} Schema for an edge with the particular config type
 */
export const createOmniEdgeHardhatSchema = <TConfig = unknown>(
    configSchema: z.ZodSchema<TConfig, z.ZodTypeDef, unknown>
): z.ZodSchema<OmniEdgeHardhat<TConfig>, z.ZodTypeDef, unknown> =>
    z.object({
        from: OmniPointOrOmniPointHardhatSchema,
        to: OmniPointOrOmniPointHardhatSchema,
        config: configSchema,
    }) as z.ZodSchema<OmniEdgeHardhat<TConfig>, z.ZodTypeDef>

/**
 * Factory for OmniGraphHardhat schemas
 *
 * @param {z.ZodSchema<OmniNodeHardhat<TNodeConfig>>} nodeSchema
 * @param {z.ZodSchema<OmniEdgeHardhat<TEdgeConfig>>} edgeSchema
 *
 * @returns {z.ZodSchema<OmniGraphHardhat<TNodeConfig, TEdgeConfig>>}
 */
export const createOmniGraphHardhatSchema = <TNodeConfig = unknown, TEdgeConfig = unknown>(
    nodeSchema: z.ZodSchema<OmniNodeHardhat<TNodeConfig>, z.ZodTypeDef, unknown>,
    edgeSchema: z.ZodSchema<OmniEdgeHardhat<TEdgeConfig>, z.ZodTypeDef, unknown>
): z.ZodSchema<OmniGraphHardhat<TNodeConfig, TEdgeConfig>, z.ZodTypeDef, unknown> =>
    z.object({
        contracts: z.array(nodeSchema),
        connections: z.array(edgeSchema),
    })

export const hasContractName = <T extends object>(value: T): value is WithContractName<T> =>
    'contractName' in value && typeof value.contractName === 'string'
