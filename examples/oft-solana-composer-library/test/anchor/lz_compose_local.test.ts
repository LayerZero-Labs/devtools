// Rewritten version of the test using local validator instead of LiteSVM
import * as anchor from '@coral-xyz/anchor'
import { MEMO_PROGRAM_ID } from '@solana/spl-memo'
import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    TOKEN_2022_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    getAccount,
    getOrCreateAssociatedTokenAccount,
} from '@solana/spl-token'
import { Connection, Keypair, PublicKey, SYSVAR_RENT_PUBKEY, SystemProgram, Transaction } from '@solana/web3.js'

import idl from '../../target/idl/composer.json'

const RAYDIUM_CLMM_ID = new PublicKey('CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK')
const COMPOSER_ID = new PublicKey('4CDvcxbE21FD3yd5AtVGmAndXxricN5aKBADz8UNyoQq')
const COMPOSER_SEED = Buffer.from('Composer')
const LZ_TYPES_SEED = Buffer.from('LzComposeTypes')
const USDE_MINT = new PublicKey('DEkqHyPN7GMRJ5cArtQFAWefqbZb33Hyf6s5iCwjEonT')
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')

const connection = new Connection('http://localhost:8899', 'confirmed')

// Add these constants for the program owners
const BPF_LOADER_UPGRADEABLE = new PublicKey('BPFLoaderUpgradeab1e11111111111111111111111')

async function verifyAccount(connection: Connection, address: PublicKey, expectedOwner: PublicKey, name: string) {
    const accountInfo = await connection.getAccountInfo(address)
    if (!accountInfo) {
        console.error(`❌ ${name} account does not exist:`, address.toString())
        return false
    }

    // Special case for program accounts
    if (name.toLowerCase().includes('program')) {
        if (!accountInfo.owner.equals(BPF_LOADER_UPGRADEABLE)) {
            console.error(
                `❌ ${name} not a valid program. Expected owner ${BPF_LOADER_UPGRADEABLE.toString()}, got ${accountInfo.owner.toString()}`
            )
            return false
        }
    } else {
        // For non-program accounts, check against expected owner
        if (!accountInfo.owner.equals(expectedOwner)) {
            console.error(
                `❌ ${name} owned by wrong program. Expected ${expectedOwner.toString()}, got ${accountInfo.owner.toString()}`
            )
            return false
        }
    }
    console.log(`✅ ${name} verified:`, address.toString())
    return true
}

test('LzCompose -> swap_v2 via local validator', async () => {
    const payer = Keypair.generate()
    // Create a new provider with the funded payer.
    const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(payer), {})
    anchor.setProvider(provider)
    const airdropSignature = await connection.requestAirdrop(payer.publicKey, 100e9)
    // Wait 5 seconds for airdrop to be processed
    await new Promise((resolve) => setTimeout(resolve, 5000))

    // Wait for confirmation
    await connection.confirmTransaction(airdropSignature)

    // Check if a mint exists
    const mintInfo = await connection.getAccountInfo(USDE_MINT)

    if (mintInfo === null) {
        console.log('Mint does not exist')
    } else {
        console.log('Mint exists')
        // You can also check if it's a valid mint account
        const isMint = mintInfo.owner.equals(TOKEN_PROGRAM_ID)
        console.log('Is valid mint:', isMint)
    }

    const program = new anchor.Program(idl as anchor.Idl, COMPOSER_ID, provider)

    const poolStatePda = new PublicKey('D2bXjvT1xDiymTeX2mHqf9WGHkSVr2hPoHJiEg2jfVjL')
    const ammConfigPda = new PublicKey('9iFER3bpjf1PTTCQCfTRu17EJgvsxo9pVyA9QWwEuX4x')
    const observationPda = new PublicKey('Cv3s57YQzJRp988qvXPfZN5xX7BUFcgB1ycA9jzSrh2n')
    const tickLowerPda = new PublicKey('J1jEbmdbtsfA26igi1ryQjejnYVQRpxnobZh9tgSaH1h')
    const tickCurrentPda = new PublicKey('8AQHmKsoFh5Uh8bzYnnQ4Fx2QL2axPao9hjnt1YQBvdS')
    const tickUpperPda = new PublicKey('3ZUDGLF7xw26gcXUhZK3tL4MU2VizCUkXoHdb2LQ4zDM')
    const tickBitmapPda = new PublicKey('FHJHGbVtNoJdM5CSqPMQH8mn8D8pGfcN4JmLNqNMPBQu')

    const inputVaultPda = new PublicKey('5Nb7bdyi4jkMdA8Xqmt72HS1fpkGRQ573Gf8PJeGunsy')
    const outputVaultPda = new PublicKey('sUfgz2jsDhN8qn1PrkWr9pVnUrLqqL1yB7WAnCj62Xz')

    const oftPda = new PublicKey('4x3oQtX4MhjTKGBeXDZbtTSLZ9cUWo5waN2UChAuthtS')
    const endpointPda = new PublicKey('2uk9pQh3tB5ErV7LGQJcbWjb4KeJ2UJki5qJZ8QG56G3')
    const [composerPda] = PublicKey.findProgramAddressSync([COMPOSER_SEED, oftPda.toBuffer()], COMPOSER_ID)
    const [lzTypesPda] = PublicKey.findProgramAddressSync([LZ_TYPES_SEED, composerPda.toBuffer()], COMPOSER_ID)
    console.log('composerPda', composerPda.toString())
    console.log('lzTypesPda', lzTypesPda.toString())

    // after you've defined inputVaultPda & outputVaultPda
    const [inVaultInfo, outVaultInfo] = await Promise.all([
        getAccount(connection, inputVaultPda),
        getAccount(connection, outputVaultPda),
    ])
    console.log(
        `Pool vault balances: input=${inVaultInfo.amount} (decimals ${inVaultInfo}), ` +
            `output=${outVaultInfo.amount} (decimals ${outVaultInfo})`
    )

    const composerUsdeAta = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        USDE_MINT,
        composerPda,
        true,
        undefined,
        undefined,
        TOKEN_PROGRAM_ID
    )
    const userUsdcAta = await getOrCreateAssociatedTokenAccount(
        connection,
        payer,
        USDC_MINT,
        composerPda,
        true,
        undefined,
        undefined,
        TOKEN_PROGRAM_ID
    )
    await new Promise((resolve) => setTimeout(resolve, 2000)) // wait 2 seconds
    console.log('ATAs created')

    try {
        const init = await program.methods
            .initComposer({
                oftPda: oftPda,
                endpointPda: endpointPda,
            })
            .accounts({
                composer: composerPda,
                lzComposeTypesAccounts: lzTypesPda,
                payer: payer.publicKey,
                systemProgram: SystemProgram.programId,
            })
            .signers([payer])
            .rpc()
        console.log('initComposer tx:', init)
        const initTx = await program.methods
            .initComposer({
                oftPda: oftPda,
                endpointPda: endpointPda,
            })
            .accounts({
                composer: composerPda,
                lzComposeTypesAccounts: lzTypesPda,
                payer: payer.publicKey,
                systemProgram: SystemProgram.programId,
            })
            .transaction()
        console.log('initTx', initTx.instructions[0].data.toString('hex'))
        console.log('initTx', initTx)

        // Save transaction data to a file
        const fs = require('fs')
        const txData = {
            instructions: initTx.instructions.map((ix) => ({
                programId: ix.programId.toString(),
                keys: ix.keys.map((key) => ({
                    pubkey: key.pubkey.toString(),
                    isSigner: key.isSigner,
                    isWritable: key.isWritable,
                })),
                data: ix.data.toString('hex'),
            })),
            recentBlockhash: initTx.recentBlockhash,
            feePayer: initTx.feePayer?.toString() || null,
        }
        fs.writeFileSync('init_tx_data.json', JSON.stringify(txData, null, 2))
        console.log('Transaction data saved to init_tx_data.json')
    } catch (error) {
        console.error('Failed to initialize composer:', error)
        throw error
    }

    const programInfo = await connection.getAccountInfo(COMPOSER_ID)
    if (!programInfo) {
        console.error('Program not found at address:', COMPOSER_ID.toString())
        throw new Error('Program not deployed')
    }
    console.log('Program data length:', programInfo.data.length)

    if (!programInfo.executable) {
        console.error('Program is not marked as executable')
        throw new Error('Program not executable')
    }

    // Verify all accounts exist and are owned by the correct programs
    console.log('\nVerifying account ownership:')

    const accountChecks = await Promise.all([
        verifyAccount(connection, RAYDIUM_CLMM_ID, BPF_LOADER_UPGRADEABLE, 'Raydium CLMM Program'),
        verifyAccount(connection, poolStatePda, RAYDIUM_CLMM_ID, 'Pool State'),
        verifyAccount(connection, ammConfigPda, RAYDIUM_CLMM_ID, 'AMM Config'),
        verifyAccount(connection, observationPda, RAYDIUM_CLMM_ID, 'Observation State'),
        verifyAccount(connection, tickLowerPda, RAYDIUM_CLMM_ID, 'Tick Array Lower'),
        verifyAccount(connection, tickCurrentPda, RAYDIUM_CLMM_ID, 'Tick Array Current'),
        verifyAccount(connection, tickUpperPda, RAYDIUM_CLMM_ID, 'Tick Array Upper'),
        verifyAccount(connection, inputVaultPda, TOKEN_PROGRAM_ID, 'Input Vault'),
        verifyAccount(connection, outputVaultPda, TOKEN_PROGRAM_ID, 'Output Vault'),
        verifyAccount(connection, USDE_MINT, TOKEN_PROGRAM_ID, 'USDE Mint'),
        verifyAccount(connection, USDC_MINT, TOKEN_PROGRAM_ID, 'USDC Mint'),
    ])

    if (accountChecks.some((check) => !check)) {
        console.log('\nSome accounts are not properly initialized. Initializing Raydium pool...')

        // Here we'll need to initialize the Raydium pool
        // This requires several steps:
        // 1. Create the AMM Config if it doesn't exist
        // 2. Create the Pool
        // 3. Initialize tick arrays

        // We'll need to import the Raydium SDK
        // const raydiumSDK = require('@raydium-io/raydium-sdk');

        // TODO: Add pool initialization code
        // For now, let's throw an error with instructions
        throw new Error(`
            Please initialize the Raydium pool first. You can do this by:
            1. Using an existing pool on devnet/mainnet instead of local
            2. Or initializing a new pool using the Raydium SDK
            
            For local testing, you might want to use these devnet addresses instead:
            - Pool: https://solscan.io/account/D2bXjvT1xDiymTeX2mHqf9WGHkSVr2hPoHJiEg2jfVjL?cluster=devnet
            - AMM Config: https://solscan.io/account/9iFER3bpjf1PTTCQCfTRu17EJgvsxo9pVyA9QWwEuX4x?cluster=devnet
            
            Would you like me to help you:
            1. Switch to using an existing devnet pool
            2. Or implement the pool initialization code?
        `)
    }

    console.log('\nAll accounts verified, proceeding with swap...')

    const amountLd = new anchor.BN(250_000)
    const vaultBAcc = await getAccount(connection, outputVaultPda)
    const vaultBBalance = new anchor.BN(vaultBAcc.amount.toString())
    console.log(`vaultB balance=${vaultBBalance.toString()}   amountLd=${amountLd.toString()}`)
    if (amountLd.gt(vaultBBalance)) {
        throw new Error(
            `Insufficient liquidity in vaultB: requested ${amountLd.toString()}, but only ${vaultBBalance.toString()} available`
        )
    }
    // ----------------------------------------------------
    // 2) build the 112‐byte payload:
    //    [0..32)   ignored by our program
    //    [32..40)  amount_ld
    //    [40..72)  compose_from (we can re‐use oftPda here)
    //    [72..80)  min_amount_out
    //    [80..112) receiver pubkey
    // ----------------------------------------------------
    const minOut = new anchor.BN(1)
    const message = Buffer.alloc(112)
    const receiver = Keypair.generate()
    const receiverUsdcAta = await getOrCreateAssociatedTokenAccount(
        connection,
        payer, // payer funds ATA creation
        USDC_MINT, // mint
        receiver.publicKey, // authority
        false, // allow owner off curve
        undefined,
        undefined,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
    )
    amountLd.toArrayLike(Buffer, 'be', 8).copy(message, 32)
    oftPda.toBuffer().copy(message, 40)
    minOut.toArrayLike(Buffer, 'be', 8).copy(message, 72)
    receiver.publicKey.toBuffer().copy(message, 80)

    const swapIx = await program.methods
        .lzCompose({
            from: oftPda,
            to: composerPda,
            guid: new Array(32).fill(0),
            index: 0,
            message: Buffer.from(message),
            extraData: Buffer.alloc(0),
        })
        .accounts({
            composer: composerPda,
            clmmProgram: RAYDIUM_CLMM_ID,
            payer: payer.publicKey,
            ammConfig: ammConfigPda,
            poolState: poolStatePda,
            inputTokenAccount: composerUsdeAta.address,
            outputTokenAccount: userUsdcAta.address,
            inputVault: inputVaultPda,
            outputVault: outputVaultPda,
            observationState: observationPda,
            tokenProgram: TOKEN_PROGRAM_ID,
            tokenProgram2022: TOKEN_2022_PROGRAM_ID,
            memoProgram: MEMO_PROGRAM_ID,
            inputVaultMint: USDE_MINT,
            outputVaultMint: USDC_MINT,
            tickBitmap: tickBitmapPda,
            tickArrayLower: tickLowerPda,
            tickArrayCurrent: tickCurrentPda,
            tickArrayUpper: tickUpperPda,
            toAddress: receiver.publicKey,
            toTokenAccount: receiverUsdcAta.address,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT_PUBKEY,
        })
        .signers([payer])
        .instruction()

    const tx = new Transaction().add(swapIx)
    tx.feePayer = payer.publicKey
    tx.recentBlockhash = (await provider.connection.getLatestBlockhash()).blockhash
    tx.sign(payer)
    // // --- INSERTED: dump every account key + owner to debug the mismatch ---
    // console.log("🔍 Checking owners on every account in SwapV2…");
    // for (const { pubkey, isWritable, isSigner } of swapIx.keys) {
    //   const info = await connection.getAccountInfo(pubkey);
    //   console.log({
    //     pubkey:   pubkey.toString(),
    //     owner:    info?.owner.toString()    ?? "account not found",
    //     writable: isWritable,
    //     signer:   isSigner,
    //   });
    // }
    const sig = await provider.sendAndConfirm(tx, [payer])
    console.log('sig', sig)
}, 30000)
