import { AddressSchema, ignoreZero } from '@layerzerolabs/devtools'
import { z } from 'zod'

/**
 * Schema for parsing receive library information coming from the contract
 */
export const ReceiveLibrarySchema = z.tuple([AddressSchema.transform(ignoreZero), z.boolean()])
