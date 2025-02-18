import { z } from 'zod'

export type DeploymentBase = z.TypeOf<typeof DeploymentBaseSchema>

export type AbiBase = z.TypeOf<typeof AbiBaseSchema>

export const AbiBaseSchema = z.array(z.unknown())

/**
 * Very basic deployment schema definition, only containing
 * the information we need for the v0 of the exporter
 */
export const DeploymentBaseSchema = z.object({
    address: z.string(),
    abi: AbiBaseSchema,
    transactionHash: z.string().nullish(),
})
