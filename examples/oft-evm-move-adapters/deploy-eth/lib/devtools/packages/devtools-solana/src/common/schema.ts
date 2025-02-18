import { z } from 'zod'
import BN from 'bn.js'
import { PublicKey } from '@solana/web3.js'

export const BNBigIntSchema = z.instanceof(BN).transform((bn) => BigInt(bn.toString()))

export const PublicKeySchema = z.instanceof(PublicKey)

export const PublicKeyBase58Schema = PublicKeySchema.transform((key) => key.toBase58())
