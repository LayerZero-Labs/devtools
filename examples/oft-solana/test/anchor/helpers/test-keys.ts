import { createHash } from 'crypto'

import { Keypair, KeypairSigner, PublicKey, createSignerFromKeypair, defaultPublicKey } from '@metaplex-foundation/umi'
import { createWeb3JsEddsa } from '@metaplex-foundation/umi-eddsa-web3js'
import { fromWeb3JsKeypair } from '@metaplex-foundation/umi-web3js-adapters'
import { Keypair as Web3Keypair } from '@solana/web3.js'

import { OftPDA } from '@layerzerolabs/oft-v2-solana-sdk'

import { OftKeySets, OftKeys } from '../types'

const eddsa = createWeb3JsEddsa()

export function createKeypairFromSeed(seed: string): Keypair {
    const hash = createHash('sha256').update(seed).digest()
    const seedBytes = hash.subarray(0, 32)
    const web3Keypair = Web3Keypair.fromSeed(seedBytes)
    return fromWeb3JsKeypair(web3Keypair)
}

export function createSignerFromSeed(seed: string): KeypairSigner {
    const keypair = createKeypairFromSeed(seed)
    return createSignerFromKeypair({ eddsa }, keypair)
}

export function createOftKeys(program: PublicKey, seedPrefix: string): OftKeys {
    const admin = createSignerFromSeed(`${seedPrefix}-admin`)
    const delegate = createSignerFromSeed(`${seedPrefix}-delegate`)
    const pauser = createSignerFromSeed(`${seedPrefix}-pauser`)
    const unpauser = createSignerFromSeed(`${seedPrefix}-unpauser`)
    const mint = createSignerFromSeed(`${seedPrefix}-mint`)
    const escrow = createSignerFromSeed(`${seedPrefix}-escrow`)
    const [oftStore] = new OftPDA(program).oftStore(escrow.publicKey)

    return {
        escrow,
        mint,
        oappAdmin: admin,
        tokenMintAuthority: defaultPublicKey(),
        oappAdminTokenAccount: undefined,
        oftStore,
        delegate,
        pauser,
        unpauser,
    }
}

export function createOftKeySets(program: PublicKey): OftKeySets {
    return {
        native: createOftKeys(program, 'oft-native'),
        adapter: createOftKeys(program, 'oft-adapter'),
    }
}
