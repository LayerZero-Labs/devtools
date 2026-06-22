import { SetConfigType } from '@layerzerolabs/lz-solana-sdk-v2'
import { Uln302ExecutorConfigSchema, Uln302UlnConfigSchema } from '@layerzerolabs/protocol-devtools'
import { PublicKey } from '@solana/web3.js'
import BN from 'bn.js'
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
            ({
                confirmations,
                requiredDVNs,
                optionalDVNs,
                optionalDVNThreshold,
                requiredDVNCount,
                optionalDVNCount,
            }) => ({
                // confirmations is a u64 on-chain; a NIL sentinel (type(uint64).max) overflows a
                // JS number, so it must be passed as a BN to avoid precision loss.
                confirmations: new BN(confirmations.toString()),
                optionalDvnCount: optionalDVNCount,
                requiredDvnCount: requiredDVNCount,
                requiredDvns: requiredDVNs.map((dvn) => new PublicKey(dvn)),
                optionalDvns: optionalDVNs.map((dvn) => new PublicKey(dvn)),
                optionalDvnThreshold: optionalDVNThreshold,
            })
        ),
    }),
])
