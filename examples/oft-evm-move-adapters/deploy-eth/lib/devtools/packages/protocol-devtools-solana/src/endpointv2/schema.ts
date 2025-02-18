import { SetConfigType } from '@layerzerolabs/lz-solana-sdk-v2'
import { Uln302ExecutorConfigSchema, Uln302UlnConfigSchema } from '@layerzerolabs/protocol-devtools'
import { PublicKey } from '@solana/web3.js'
import { z } from 'zod'

export const SetConfigSchema = z.union([
    z.object({
        configType: z.literal(SetConfigType.EXECUTOR),
        config: Uln302ExecutorConfigSchema.transform(({ executor, maxMessageSize }) => ({
            executor: new PublicKey(executor),
            maxMessageSize,
        })),
    }),
    z.object({
        configType: z.union([z.literal(SetConfigType.RECEIVE_ULN), z.literal(SetConfigType.SEND_ULN)]),
        config: Uln302UlnConfigSchema.transform(
            ({ confirmations, requiredDVNs, optionalDVNs, optionalDVNThreshold }) => ({
                confirmations: Number(confirmations),
                optionalDvnCount: optionalDVNs.length,
                requiredDvnCount: requiredDVNs.length,
                requiredDvns: requiredDVNs.map((dvn) => new PublicKey(dvn)),
                optionalDvns: optionalDVNs.map((dvn) => new PublicKey(dvn)),
                optionalDvnThreshold: optionalDVNThreshold,
            })
        ),
    }),
])
