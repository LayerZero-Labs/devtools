// Rewritten version of the test using local validator instead of LiteSVM
import * as anchor from '@coral-xyz/anchor'
import {
    Raydium,
    getPdaObservationAccount,
    getPdaPoolVaultId,
    getPdaTickArrayAddress,
} from '@raydium-io/raydium-sdk-v2'
import { MEMO_PROGRAM_ID } from '@solana/spl-memo'
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, getOrCreateAssociatedTokenAccount } from '@solana/spl-token'
import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js'

import idl from '../../target/idl/composer.json'

const RAYDIUM_CLMM_ID = new PublicKey('CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK')
const COMPOSER_ID = new PublicKey('2TUdVCMQsefMs28hTeMKAHTjgz8cdMbo7V5oEdrYSu7G')
const COMPOSER_SEED = Buffer.from('Composer')
const LZ_TYPES_SEED = Buffer.from('LzComposeTypes')
const USDE_MINT = new PublicKey('DEkqHyPN7GMRJ5cArtQFAWefqbZb33Hyf6s5iCwjEonT')
const USDC_MINT = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v')

const connection = new Connection('http://localhost:8899', 'confirmed')

test('LzCompose -> swap_v2 via local validator', async () => {
    const payer = Keypair.generate()
    // Create a new provider with the funded payer.
    const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(payer), {})
    anchor.setProvider(provider)
    await provider.connection.requestAirdrop(payer.publicKey, 10000000e9)

    const program = new anchor.Program(idl as anchor.Idl, COMPOSER_ID, provider)

    const raydium = await Raydium.load({
        connection: provider.connection,
        owner: payer,
        disableLoadToken: true,
    })
    const { data: pools } = await raydium.api.fetchPoolByMints({
        mint1: USDE_MINT,
        mint2: USDC_MINT,
    })
    const pool = pools[0]
    const poolStatePda = new PublicKey(pool.id)
    const ammConfigPda = new PublicKey('4BLNHtVe942GSs4teSZqGX24xwKNkqU7bGgNn3iUiUpw')
    const observationPda = getPdaObservationAccount(RAYDIUM_CLMM_ID, poolStatePda).publicKey
    const tickLower = getPdaTickArrayAddress(RAYDIUM_CLMM_ID, poolStatePda, -1).publicKey
    const tickCurrent = getPdaTickArrayAddress(RAYDIUM_CLMM_ID, poolStatePda, 0).publicKey
    const tickUpper = getPdaTickArrayAddress(RAYDIUM_CLMM_ID, poolStatePda, 1).publicKey
    console.log('raydium accounts derived')

    const [authorityPda] = PublicKey.findProgramAddressSync([poolStatePda.toBuffer()], RAYDIUM_CLMM_ID)

    const { publicKey: inputVaultPda } = getPdaPoolVaultId(RAYDIUM_CLMM_ID, poolStatePda, USDE_MINT)
    const { publicKey: outputVaultPda } = getPdaPoolVaultId(RAYDIUM_CLMM_ID, poolStatePda, USDC_MINT)
    console.log('vaults derived')

    const oftPda = Keypair.generate()
    const endpointPda = Keypair.generate()
    const [composerPda] = PublicKey.findProgramAddressSync([COMPOSER_SEED, oftPda.publicKey.toBuffer()], COMPOSER_ID)
    const [lzTypesPda] = PublicKey.findProgramAddressSync([LZ_TYPES_SEED, composerPda.toBuffer()], COMPOSER_ID)
    console.log('composer accounts derived')

    const composerUsdeAta = await getOrCreateAssociatedTokenAccount(connection, payer, USDE_MINT, composerPda, true)
    const userUsdcAta = await getOrCreateAssociatedTokenAccount(connection, payer, USDC_MINT, composerPda, true)
    await new Promise((resolve) => setTimeout(resolve, 2000)) // wait 2 seconds
    console.log('ATAs created')

    const init = await program.methods
        .initComposer({
            oftPda: oftPda.publicKey,
            endpointPda: endpointPda.publicKey,
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
    const amountLd = new anchor.BN(250_000)
    const minOut = new anchor.BN(1)
    const message = Buffer.alloc(80)
    amountLd.toArrayLike(Buffer, 'be', 8).copy(message, 32)
    oftPda.publicKey.toBuffer().copy(message, 40)
    minOut.toArrayLike(Buffer, 'be', 8).copy(message, 72)

    const swapIx = await program.methods
        .lzCompose({ from: oftPda.publicKey, to: composerPda, guid: [1], index: 0, message })
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
            authority: authorityPda,
            tickArrayLower: tickLower,
            tickArrayCurrent: tickCurrent,
            tickArrayUpper: tickUpper,
        })
        .signers([payer])
        .instruction()

    const tx = new Transaction().add(swapIx)
    tx.feePayer = payer.publicKey
    tx.recentBlockhash = (await provider.connection.getLatestBlockhash()).blockhash
    tx.sign(payer)

    if (provider.sendAndConfirm) {
        await provider.sendAndConfirm(tx, [payer])
    } else {
        throw new Error('sendAndConfirm is not defined on the provider')
    }
})
