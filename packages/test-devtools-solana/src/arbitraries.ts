import fc from 'fast-check'
import { Keypair } from '@solana/web3.js'

export const seedArbitrary = fc.uint8Array({ minLength: 32, maxLength: 32 })

export const keypairArbitrary = seedArbitrary.map((seed) => Keypair.fromSeed(seed))
