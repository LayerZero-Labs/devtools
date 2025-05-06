// tasks/initComposer.ts
import fs from 'fs'

import * as anchor from '@coral-xyz/anchor'
import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    getOrCreateAssociatedTokenAccount,
} from '@solana/spl-token'
import { Connection, Keypair, PublicKey, SystemProgram, TransactionSignature } from '@solana/web3.js'
import { task } from 'hardhat/config'

import idl from '../../target/idl/composer.json'

task('lz:solana:init-composer', 'Initialize the Composer PDA on Solana')
    .addOptionalParam(
        'rpcUrl',
        'Solana JSON RPC endpoint',
        'https://mainnet.helius-rpc.com/?api-key=78552846-acd7-40df-8f1c-79439387be5a'
    )
    .setAction(async ({ rpcUrl }) => {
        // ─── CONFIG ────────────────────────────────────────────────────────────────
        const COMPOSER_ID = new PublicKey('6xhpdhwyzpjxc6n2KqQS8a3W7Busn6nqGYaobVV25kN5')
        const OFT_PDA = new PublicKey('4x3oQtX4MhjTKGBeXDZbtTSL9cUWo5waN2UChAuthtS')
        const ENDPOINT_PDA = new PublicKey('2uk9pQh3tB5ErV7LGQJcbWjb4KeJ2UJki5qJZ8QG56G3')
        const ENDPOINT_PROGRAM_ID = new PublicKey('76y77prsiCMvXMjuoZ5VRrhG5qYBrUMYTE5WgHqgjEn6')
        const CLMM_PROGRAM_ID = new PublicKey('CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK')
        const RECEIVER_PDA = new PublicKey('6tzUZqC33igPgP7YyDnUxQg6eupMmZGRGKdVAksgRzvk')

        const AMM_CONFIG_PDA = new PublicKey('9iFER3bpjf1PTTCQCfTRu17EJgvsxo9pVyA9QWwEuX4x')
        const POOL_STATE_PDA = new PublicKey('D2bXjvT1xDiymTeX2mHqf9WGHkSVr2hPoHJiEg2jfVjL')
        const OBSERVATION_PDA = new PublicKey('Cv3s57YQzJRp988qvXPfZN5xX7BUFcgB1ycA9jzSrh2n')
        const TICK_LOWER_PDA = new PublicKey('J1jEbmdbtsfA26igi1ryQjejnYVQRpxnobZh9tgSaH1h')
        const TICK_CURRENT_PDA = new PublicKey('8AQHmKsoFh5Uh8bzYnnQ4Fx2QL2axPao9hjnt1YQBvdS')
        const TICK_UPPER_PDA = new PublicKey('3ZUDGLF7xw26gcXUhZK3tL4MU2VizCUkXoHdb2LQ4zDM')
        const TICK_BITMAP_PDA = new PublicKey('FHJHGbVtNoJdM5CSqPMQH8mn8D8pGfcN4JmLNqNMPBQu')

        const INPUT_VAULT_PDA = new PublicKey('5Nb7bdyi4jkMdA8Xqmt72HS1fpkGRQ573Gf8PJeGunsy')
        const OUTPUT_VAULT_PDA = new PublicKey('sUfgz2jsDhN8qn1PrkWr9pVnUrLqqL1yB7WAnCj62Xz')

        const USDE_MINT = new PublicKey('DEkqHyPN7GMRJ5cArtQFAWefqbZb33Hyf6s5iCwjEonT')
        const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')
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

        // 3) Derive the Composer PDA
        const [composerPda] = PublicKey.findProgramAddressSync(
            [Buffer.from('Composer'), OFT_PDA.toBuffer()],
            COMPOSER_ID
        )
        console.log('⛓ composer PDA:', composerPda.toBase58())

        const [typesPda] = PublicKey.findProgramAddressSync(
            [Buffer.from('LzComposeTypes'), composerPda.toBuffer()],
            COMPOSER_ID
        )
        console.log('⛓ types PDA:', typesPda.toBase58())

        // 4) Ensure Composer has ATAs for A & B mints
        const composerUsdeAta = await getOrCreateAssociatedTokenAccount(
            connection,
            keypair,
            USDE_MINT,
            composerPda,
            true,
            undefined,
            undefined,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        )
        const composerUsdcAta = await getOrCreateAssociatedTokenAccount(
            connection,
            keypair,
            USDC_MINT,
            RECEIVER_PDA,
            true,
            undefined,
            undefined,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        )
        console.log('✅ Composer ATAs:', {
            usde: composerUsdeAta.address.toBase58(),
            usdc: composerUsdcAta.address.toBase58(),
        })

        // 5) Fire the initComposer RPC
        const sig: TransactionSignature = await program.methods
            .initComposer({
                oftPda: OFT_PDA,
                endpointPda: ENDPOINT_PDA,
                endpointProgram: ENDPOINT_PROGRAM_ID,
                tokenProgram: TOKEN_PROGRAM_ID,
                tokenProgram2022: TOKEN_2022_PROGRAM_ID,
                clmmProgram: CLMM_PROGRAM_ID,
                ammConfig: AMM_CONFIG_PDA,
                poolState: POOL_STATE_PDA,
                inputVault: INPUT_VAULT_PDA,
                outputVault: OUTPUT_VAULT_PDA,
                observationState: OBSERVATION_PDA,
                tickArrayLower: TICK_LOWER_PDA,
                tickArrayCurrent: TICK_CURRENT_PDA,
                tickArrayUpper: TICK_UPPER_PDA,
                tickBitmap: TICK_BITMAP_PDA,
                inputTokenAccount: composerUsdeAta.address,
                outputTokenAccount: composerUsdcAta.address,
                inputVaultMint: USDE_MINT,
                outputVaultMint: USDC_MINT,
            })
            .accounts({
                composer: composerPda,
                lzComposeTypesAccounts: typesPda,
                payer: provider.wallet.publicKey,
                systemProgram: SystemProgram.programId,
            })
            .rpc()

        console.log('✅ initComposer tx:', sig)
    })
