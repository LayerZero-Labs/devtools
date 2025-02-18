import fc from 'fast-check'
import { Keypair } from '@solana/web3.js'
import { createHash } from 'crypto'
import bs58 from 'bs58'

export const seedArbitrary = fc.uint8Array({ minLength: 32, maxLength: 32 })

export const keypairArbitrary = seedArbitrary.map((seed) => Keypair.fromSeed(seed))

export const solanaBlockhashArbitrary = fc
    .string()
    .map((value) => bs58.encode(Uint8Array.from(createHash('sha256').update(value).digest())))
