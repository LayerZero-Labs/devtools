import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import {
    ASSOCIATED_TOKEN_PROGRAM_ID,
    ExtensionType,
    TOKEN_2022_PROGRAM_ID,
    createAssociatedTokenAccountInstruction,
    createInitializeMintInstruction,
    createInitializeTransferHookInstruction,
    createMintToInstruction,
    createTransferCheckedWithTransferHookInstruction,
    getAssociatedTokenAddressSync,
    getMintLen,
} from '@solana/spl-token'
import { Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js'

import { TransferHook } from '../../target/types/transfer_hook'

describe('transfer-hook', () => {
    // Configure the client to use the local cluster
    const provider = anchor.AnchorProvider.env()
    anchor.setProvider(provider)

    const program = anchor.workspace.TransferHook as Program<TransferHook>

    // Test accounts
    const payer = (provider.wallet as anchor.Wallet).payer
    const mintKeypair = Keypair.generate()
    const mint = mintKeypair.publicKey

    // Token accounts
    let sourceTokenAccount: PublicKey
    let destinationTokenAccount: PublicKey
    const destinationOwner = Keypair.generate()

    // Additional test accounts for edge cases
    let secondDestinationAccount: PublicKey
    const secondDestinationOwner = Keypair.generate()

    // PDAs
    let extraAccountMetaListPDA: PublicKey

    const decimals = 9
    const initialMintAmount = 100_000 // 100,000 raw tokens

    beforeAll(async () => {
        // Derive the ExtraAccountMetaList PDA
        ;[extraAccountMetaListPDA] = PublicKey.findProgramAddressSync(
            [Buffer.from('extra-account-metas'), mint.toBuffer()],
            program.programId
        )

        // Calculate associated token accounts
        sourceTokenAccount = getAssociatedTokenAddressSync(
            mint,
            payer.publicKey,
            false,
            TOKEN_2022_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        )

        destinationTokenAccount = getAssociatedTokenAddressSync(
            mint,
            destinationOwner.publicKey,
            false,
            TOKEN_2022_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        )

        secondDestinationAccount = getAssociatedTokenAddressSync(
            mint,
            secondDestinationOwner.publicKey,
            false,
            TOKEN_2022_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
        )
    })

    describe('Mint Setup', () => {
        it('creates a Token-2022 mint with Transfer Hook extension', async () => {
            // Calculate space for mint with Transfer Hook extension
            const extensions = [ExtensionType.TransferHook]
            const mintLen = getMintLen(extensions)

            // Get rent for the mint account
            const lamports = await provider.connection.getMinimumBalanceForRentExemption(mintLen)

            // Create mint account with Transfer Hook extension
            const transaction = new Transaction().add(
                // Create account
                SystemProgram.createAccount({
                    fromPubkey: payer.publicKey,
                    newAccountPubkey: mint,
                    space: mintLen,
                    lamports,
                    programId: TOKEN_2022_PROGRAM_ID,
                }),
                // Initialize Transfer Hook extension - MUST come before mint init
                createInitializeTransferHookInstruction(
                    mint,
                    payer.publicKey, // authority
                    program.programId, // transfer hook program
                    TOKEN_2022_PROGRAM_ID
                ),
                // Initialize mint
                createInitializeMintInstruction(
                    mint,
                    decimals,
                    payer.publicKey, // mint authority
                    null, // freeze authority
                    TOKEN_2022_PROGRAM_ID
                )
            )

            await sendAndConfirmTransaction(provider.connection, transaction, [payer, mintKeypair])

            // Verify mint was created
            const mintInfo = await provider.connection.getAccountInfo(mint)
            expect(mintInfo).not.toBeNull()
            expect(mintInfo!.owner.toBase58()).toBe(TOKEN_2022_PROGRAM_ID.toBase58())
        })
    })

    describe('ExtraAccountMetaList Initialization', () => {
        it('initializes the ExtraAccountMetaList PDA', async () => {
            await program.methods
                .initializeExtraAccountMetaList()
                .accounts({
                    payer: payer.publicKey,
                    mint: mint,
                    extraAccountMetaList: extraAccountMetaListPDA,
                    systemProgram: SystemProgram.programId,
                })
                .signers([payer])
                .rpc()

            // Verify the account was created
            const account = await provider.connection.getAccountInfo(extraAccountMetaListPDA)
            expect(account).not.toBeNull()
            expect(account!.owner.toBase58()).toBe(program.programId.toBase58())
        })

        it('fails to initialize twice (account already exists)', async () => {
            try {
                await program.methods
                    .initializeExtraAccountMetaList()
                    .accounts({
                        payer: payer.publicKey,
                        mint: mint,
                        extraAccountMetaList: extraAccountMetaListPDA,
                        systemProgram: SystemProgram.programId,
                    })
                    .signers([payer])
                    .rpc()
                fail('Should have thrown an error')
            } catch (error: any) {
                // Expected: account already exists
                expect(error.toString()).toContain('already in use')
            }
        })
    })

    describe('Token Account Setup', () => {
        it('creates source and destination token accounts', async () => {
            // Create source token account (for payer)
            const createSourceAta = createAssociatedTokenAccountInstruction(
                payer.publicKey,
                sourceTokenAccount,
                payer.publicKey,
                mint,
                TOKEN_2022_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            )

            // Create destination token account
            const createDestAta = createAssociatedTokenAccountInstruction(
                payer.publicKey,
                destinationTokenAccount,
                destinationOwner.publicKey,
                mint,
                TOKEN_2022_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            )

            const transaction = new Transaction().add(createSourceAta, createDestAta)

            await sendAndConfirmTransaction(provider.connection, transaction, [payer])

            // Verify accounts were created
            const sourceInfo = await provider.connection.getAccountInfo(sourceTokenAccount)
            const destInfo = await provider.connection.getAccountInfo(destinationTokenAccount)
            expect(sourceInfo).not.toBeNull()
            expect(destInfo).not.toBeNull()
        })

        it('mints tokens to source account', async () => {
            const mintToSource = createMintToInstruction(
                mint,
                sourceTokenAccount,
                payer.publicKey,
                initialMintAmount,
                [],
                TOKEN_2022_PROGRAM_ID
            )

            const transaction = new Transaction().add(mintToSource)

            await sendAndConfirmTransaction(provider.connection, transaction, [payer])
        })
    })

    describe('Transfer Hook Validation - Happy Path', () => {
        it('allows transfer of 100 tokens (at threshold)', async () => {
            const transferAmount = BigInt(100)

            const transferIx = await createTransferCheckedWithTransferHookInstruction(
                provider.connection,
                sourceTokenAccount,
                mint,
                destinationTokenAccount,
                payer.publicKey,
                transferAmount,
                decimals,
                [],
                'confirmed',
                TOKEN_2022_PROGRAM_ID
            )

            const transaction = new Transaction().add(transferIx)

            const txSig = await sendAndConfirmTransaction(provider.connection, transaction, [payer])

            expect(txSig).toBeDefined()
        })

        it('allows transfer of 500 tokens', async () => {
            const transferAmount = BigInt(500)

            const transferIx = await createTransferCheckedWithTransferHookInstruction(
                provider.connection,
                sourceTokenAccount,
                mint,
                destinationTokenAccount,
                payer.publicKey,
                transferAmount,
                decimals,
                [],
                'confirmed',
                TOKEN_2022_PROGRAM_ID
            )

            const transaction = new Transaction().add(transferIx)

            const txSig = await sendAndConfirmTransaction(provider.connection, transaction, [payer])

            expect(txSig).toBeDefined()
        })

        it('allows transfer of large amount (10,000 tokens)', async () => {
            const transferAmount = BigInt(10_000)

            const transferIx = await createTransferCheckedWithTransferHookInstruction(
                provider.connection,
                sourceTokenAccount,
                mint,
                destinationTokenAccount,
                payer.publicKey,
                transferAmount,
                decimals,
                [],
                'confirmed',
                TOKEN_2022_PROGRAM_ID
            )

            const transaction = new Transaction().add(transferIx)

            const txSig = await sendAndConfirmTransaction(provider.connection, transaction, [payer])

            expect(txSig).toBeDefined()
        })
    })

    describe('Transfer Hook Validation - Error Cases', () => {
        it('rejects transfer of 99 tokens (just below threshold)', async () => {
            const transferAmount = BigInt(99)

            const transferIx = await createTransferCheckedWithTransferHookInstruction(
                provider.connection,
                sourceTokenAccount,
                mint,
                destinationTokenAccount,
                payer.publicKey,
                transferAmount,
                decimals,
                [],
                'confirmed',
                TOKEN_2022_PROGRAM_ID
            )

            const transaction = new Transaction().add(transferIx)

            try {
                await sendAndConfirmTransaction(provider.connection, transaction, [payer])
                fail('Transfer should have been rejected')
            } catch (error: any) {
                // Expected: transfer hook rejects amounts < 100
                expect(error.toString()).toContain('custom program error')
            }
        })

        it('rejects transfer of 50 tokens (below threshold)', async () => {
            const transferAmount = BigInt(50)

            const transferIx = await createTransferCheckedWithTransferHookInstruction(
                provider.connection,
                sourceTokenAccount,
                mint,
                destinationTokenAccount,
                payer.publicKey,
                transferAmount,
                decimals,
                [],
                'confirmed',
                TOKEN_2022_PROGRAM_ID
            )

            const transaction = new Transaction().add(transferIx)

            try {
                await sendAndConfirmTransaction(provider.connection, transaction, [payer])
                fail('Transfer should have been rejected')
            } catch (error: any) {
                expect(error.toString()).toContain('custom program error')
            }
        })

        it('rejects transfer of 1 token (minimum)', async () => {
            const transferAmount = BigInt(1)

            const transferIx = await createTransferCheckedWithTransferHookInstruction(
                provider.connection,
                sourceTokenAccount,
                mint,
                destinationTokenAccount,
                payer.publicKey,
                transferAmount,
                decimals,
                [],
                'confirmed',
                TOKEN_2022_PROGRAM_ID
            )

            const transaction = new Transaction().add(transferIx)

            try {
                await sendAndConfirmTransaction(provider.connection, transaction, [payer])
                fail('Transfer should have been rejected')
            } catch (error: any) {
                expect(error.toString()).toContain('custom program error')
            }
        })
    })

    describe('Transfer Hook - Edge Cases', () => {
        it('handles multiple sequential valid transfers', async () => {
            // Do 3 transfers in sequence
            for (let i = 0; i < 3; i++) {
                const transferAmount = BigInt(150 + i * 50)

                const transferIx = await createTransferCheckedWithTransferHookInstruction(
                    provider.connection,
                    sourceTokenAccount,
                    mint,
                    destinationTokenAccount,
                    payer.publicKey,
                    transferAmount,
                    decimals,
                    [],
                    'confirmed',
                    TOKEN_2022_PROGRAM_ID
                )

                const transaction = new Transaction().add(transferIx)
                await sendAndConfirmTransaction(provider.connection, transaction, [payer])
            }
        })

        it('allows transfer to new account after creating it', async () => {
            // Create second destination account
            const createSecondAta = createAssociatedTokenAccountInstruction(
                payer.publicKey,
                secondDestinationAccount,
                secondDestinationOwner.publicKey,
                mint,
                TOKEN_2022_PROGRAM_ID,
                ASSOCIATED_TOKEN_PROGRAM_ID
            )

            const createTx = new Transaction().add(createSecondAta)
            await sendAndConfirmTransaction(provider.connection, createTx, [payer])

            // Now transfer to it
            const transferAmount = BigInt(200)
            const transferIx = await createTransferCheckedWithTransferHookInstruction(
                provider.connection,
                sourceTokenAccount,
                mint,
                secondDestinationAccount,
                payer.publicKey,
                transferAmount,
                decimals,
                [],
                'confirmed',
                TOKEN_2022_PROGRAM_ID
            )

            const transaction = new Transaction().add(transferIx)
            const txSig = await sendAndConfirmTransaction(provider.connection, transaction, [payer])

            expect(txSig).toBeDefined()
        })
    })
})
