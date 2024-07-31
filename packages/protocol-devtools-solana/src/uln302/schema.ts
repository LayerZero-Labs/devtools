import { UIntBigIntSchema, UIntNumberSchema } from '@layerzerolabs/devtools'
import { BNBigIntSchema, PublicKeyBase58Schema } from '@layerzerolabs/devtools-solana'
import { Uln302UlnConfig } from '@layerzerolabs/protocol-devtools'
import { z } from 'zod'

export const Uln302UlnConfigInputSchema: z.ZodSchema<Uln302UlnConfig, z.ZodTypeDef, unknown> = z
    .object({
        confirmations: z.union([UIntBigIntSchema, BNBigIntSchema]),
        optionalDvnThreshold: UIntNumberSchema,
        requiredDvns: z.array(PublicKeyBase58Schema),
        optionalDvns: z.array(PublicKeyBase58Schema),
    })
    .transform(({ confirmations, optionalDvnThreshold, requiredDvns, optionalDvns }) => ({
        confirmations,
        optionalDVNThreshold: optionalDvnThreshold,
        requiredDVNs: requiredDvns,
        optionalDVNs: optionalDvns,
    }))
