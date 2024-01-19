import { z } from 'zod'
import { AddressSchema } from '@layerzerolabs/devtools'
import { BigNumberishNumberSchema } from '@layerzerolabs/devtools-evm'
import type { Timeout } from '@layerzerolabs/protocol-devtools'

export const TimeoutSchema = z.object({
    lib: AddressSchema,
    expiry: BigNumberishNumberSchema,
}) satisfies z.ZodSchema<Timeout, z.ZodTypeDef, unknown>
