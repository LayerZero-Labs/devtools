import { AddressSchema } from '@layerzerolabs/devtools'
import { z } from 'zod'

export const OwnableNodeConfigSchema = z
    .object({
        owner: AddressSchema.nullish(),
    })
    // We'll pass all unknown properties through without validating them
    .passthrough()
