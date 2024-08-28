import * as anchor from '@coral-xyz/anchor'
import { TOKEN_PROGRAM_ID, createInitializeMintInstruction, getMintLen } from '@solana/spl-token'
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js'

import { OftTools } from '@layerzerolabs/lz-solana-sdk-v2'

import endpointIdl from '../../target/idl/endpoint.json'
import oftIdl from '../../target/idl/oft.json'

const OFT_SEED = 'Oft'
const SOLANA_OFT_TOKEN_DECIMALS = 8
const OFT_SHARE_DECIMALS = 6

describe('OFT', () => {
    // Configure the client to use the local cluster.
    const provider = anchor.AnchorProvider.local(undefined, {
        commitment: 'confirmed',
        preflightCommitment: 'confirmed',
    })
    const wallet = provider.wallet as anchor.Wallet
    const OFT_PROGRAM_ID = new PublicKey(oftIdl.metadata.address)
    const ENDPOINT_PROGRAM_ID = new PublicKey(endpointIdl.metadata.address)

    it('should initialize an OFT', async () => {
        const mintKp = Keypair.generate()
        const [oftConfigPda] = PublicKey.findProgramAddressSync(
            [Buffer.from(OFT_SEED, 'utf8'), mintKp.publicKey.toBuffer()],
            new anchor.web3.PublicKey(oftIdl.metadata.address)
        )

        // step 1, create the mint token
        const createMintIxs = [
            SystemProgram.createAccount({
                fromPubkey: wallet.publicKey,
                newAccountPubkey: mintKp.publicKey,
                space: getMintLen([]),
                lamports: await provider.connection.getMinimumBalanceForRentExemption(getMintLen([])),
                programId: TOKEN_PROGRAM_ID,
            }),
            createInitializeMintInstruction(mintKp.publicKey, SOLANA_OFT_TOKEN_DECIMALS, oftConfigPda, oftConfigPda),
        ]
        await provider.sendAndConfirm(new anchor.web3.Transaction().add(...createMintIxs), [wallet.payer, mintKp])

        // step 2, create the OFT token
        const initOftIx = await OftTools.createInitNativeOftIx(
            OFT_PROGRAM_ID,
            wallet.publicKey,
            wallet.publicKey,
            mintKp.publicKey,
            wallet.publicKey,
            OFT_SHARE_DECIMALS,
            ENDPOINT_PROGRAM_ID,
            TOKEN_PROGRAM_ID
        )

        await provider.sendAndConfirm(new anchor.web3.Transaction().add(initOftIx), [wallet.payer])

        // check status
        const delegate = await OftTools.getDelegate(provider.connection, oftConfigPda, ENDPOINT_PROGRAM_ID)
        expect(delegate.toBase58()).toBe(wallet.publicKey.toBase58())
    })
})
