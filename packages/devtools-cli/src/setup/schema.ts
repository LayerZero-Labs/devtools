import { z } from 'zod'
import type { CLISetup } from '@/types'
import { EndpointIdSchema, OmniPointSchema } from '@layerzerolabs/devtools'

export const CLISetupSchema: z.ZodSchema<CLISetup, z.ZodTypeDef, unknown> = z.object({
    createSdk: z.function().args(OmniPointSchema).returns(z.any()),
    createSigner: z.function().args(EndpointIdSchema).returns(z.any()),
    configure: z.function().args(z.any(), z.any()).returns(z.any()).optional(),
    loadConfig: z.function().args(z.string()).returns(z.any()).optional(),
})
