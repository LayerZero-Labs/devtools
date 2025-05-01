// tasks/initComposer.ts
import fs from 'fs'

import * as anchor from '@coral-xyz/anchor'
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import { task } from 'hardhat/config'

import idl from '../../target/idl/composer.json'

task('lz:solana:init-composer', 'Initialize the Composer PDA on Solana')
    .addOptionalParam(
        'rpcUrl',
        'Solana JSON RPC endpoint',
        'https://mainnet.helius-rpc.com/?api-key=78552846-acd7-40df-8f1c-79439387be5a',
        undefined
    )
    .setAction(async ({ rpcUrl }, hre) => {
        // ─── CONFIG ────────────────────────────────────────────────────────────────
        const COMPOSER_ID = new PublicKey('4CDvcxbE21FD3yd5AtVGmAndXxricN5aKBADz8UNyoQq')
        const OFT_PDA = new PublicKey('4x3oQtX4MhjTKGBeXDZbtTSL9cUWo5waN2UChAuthtS')
        const ENDPOINT_PDA = new PublicKey('2uk9pQh3tB5ErV7LGQJcbWjb4KeJ2UJki5qJZ8QG56G3')
        const COMPOSER_SEED = Buffer.from('Composer')
        const LZ_TYPES_SEED = Buffer.from('LzComposeTypes')
        // ────────────────────────────────────────────────────────────────────────────

        // 1) Set up Anchor + wallet
        const connection = new Connection(rpcUrl, 'confirmed')
        const keypair = Keypair.fromSecretKey(new Uint8Array(JSON.parse(fs.readFileSync('./wallet.json', 'utf-8'))))
        const wallet = new anchor.Wallet(keypair)
        const provider = new anchor.AnchorProvider(connection, wallet, {
            commitment: 'confirmed',
        })
        anchor.setProvider(provider)

        // 2) Load your on-chain program
        const program = new anchor.Program(idl as anchor.Idl, COMPOSER_ID, provider)

        // 3) Derive the two PDAs
        const [composerPda] = PublicKey.findProgramAddressSync([COMPOSER_SEED, OFT_PDA.toBuffer()], COMPOSER_ID)
        const [typesPda] = PublicKey.findProgramAddressSync([LZ_TYPES_SEED, composerPda.toBuffer()], COMPOSER_ID)

        console.log('⛓ composer PDA:', composerPda.toBase58())
        console.log('🔧 types PDA:   ', typesPda.toBase58())

        // 4) Fire the initComposer RPC
        const sig = await program.methods
            .initComposer({
                oftPda: OFT_PDA,
                endpointPda: ENDPOINT_PDA,
            })
            .accounts({
                composer: composerPda,
                lzComposeTypesAccounts: typesPda,
                payer: provider.wallet.publicKey,
                systemProgram: SystemProgram.programId,
            })
            .rpc()

        console.log('✅ tx:', sig)
    })
