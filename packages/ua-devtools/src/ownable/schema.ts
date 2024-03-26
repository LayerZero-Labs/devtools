import { AddressSchema } from '@layerzerolabs/devtools'
import { z } from 'zod'

export const OwnableNodeConfigSchema = z.object({
    owner: AddressSchema.optional(),
})
