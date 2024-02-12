import { z } from 'zod'

export const OptimizerSchema = z.object({
    enabled: z.boolean().optional(),
    runs: z.number().optional(),
})

export const SourcesSchema = z.record(
    z.string(),
    z.object({
        content: z.string(),
    })
)

export type MinimalAbi = z.TypeOf<typeof MinimalAbiSchema>

export const MinimalAbiSchema = z.array(z.record(z.string(), z.any()))

export type Metadata = z.TypeOf<typeof MetadataSchema>

export const MetadataSchema = z.object({
    language: z.string(),
    compiler: z.object({
        version: z.string(),
    }),
    settings: z.object({
        compilationTarget: z.record(z.string(), z.string()),
        evmVersion: z.string(),
        optimizer: z.object({
            enabled: z.boolean().optional(),
            runs: z.number().optional(),
        }),
    }),
    sources: z.record(
        z.string(),
        z.object({
            content: z.string(),
        })
    ),
})

export type Deployment = z.TypeOf<typeof DeploymentSchema>

export const DeploymentSchema = z.object({
    address: z.string(),
    // The ABI schema from e.g. abitype is failing for the deployment files
    // so we'll use a simplified but more tolerant schema
    //
    // Since zod will remove all the args we don't pass here, we need to include
    // what's necessary for further processing - fragment & input types
    abi: MinimalAbiSchema,
    args: z.array(z.any()),
    solcInputHash: z.string(),
    metadata: z
        .string()
        .transform((value, ctx) => {
            try {
                return JSON.parse(value)
            } catch (e) {
                ctx.addIssue({ code: 'custom', message: 'Invalid JSON' })

                return z.NEVER
            }
        })
        .pipe(MetadataSchema),
    bytecode: z.string(),
    deployedBytecode: z.string(),
})
