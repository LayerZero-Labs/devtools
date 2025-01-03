import { AnchorProvider, Program } from '@coral-xyz/anchor'
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'
import { TOKEN_PROGRAM_ID } from '@solana/spl-token'
import { PublicKey } from '@solana/web3.js'
import { task } from 'hardhat/config'

import { EndpointId } from '@layerzerolabs/lz-definitions'

import { deriveConnection, getExplorerTxLink } from './index'

interface Args {
    eid: EndpointId
    programId: string
    oftStore: string
    tokenEscrow: string
    tokenMint: string
    tokenProgram: string
    multisig: string
    computeUnitPriceScaleFactor: number
}

// TODO: no need to pass in oft store? since we can derive
task('lz:oft:solana:renounce-freeze', 'Renounce freeze authority for an OFT token')
    .addParam('eid', 'The endpoint ID', undefined, types.eid)
    .addParam('programId', 'The OFT program ID', undefined, types.string)
    .addParam('tokenEscrow', 'The OFT token escrow public key', undefined, types.string)
    .addParam('oftStore', 'The OFT Store public key', undefined, types.string)
    .addParam('tokenMint', 'The OFT token mint public key', undefined, types.string)
    .addParam('multisig', 'The multisig public key', undefined, types.string)
    .addParam('computeUnitPriceScaleFactor', 'The compute unit price scale factor', 4, types.float, true)
    .setAction(
        async ({
            eid,
            programId: programIdStr,
            oftStore: oftStoreStr,
            tokenEscrow: tokenEscrowStr,
            tokenMint: tokenMintStr,
            multisig: multiSigStr,
            computeUnitPriceScaleFactor,
        }: Args) => {
            const { connection, umi, umiWalletSigner, web3JsKeypair } = await deriveConnection(eid)

            // TODO: clean up below block
            const wallet = new NodeWallet(web3JsKeypair)
            const provider = new AnchorProvider(connection, wallet, {
                commitment: 'processed',
            })

            const IDL = await import('../../target/idl/oft.json').then((module) => module.default)
            const anchorTypes = await import('../../target/types/oft').then((module) => module)

            // @ts-ignore we can ignore the IDL type error, which is a quirk of Anchor
            const program = new Program<typeof anchorTypes.IDL>(IDL, programIdStr, provider)

            const [oftStorePda, oftStoreBump] = PublicKey.findProgramAddressSync(
                [Buffer.from('OFT'), new PublicKey(tokenEscrowStr).toBuffer()],
                program.programId
            )
            if (oftStorePda.toString() != oftStoreStr) {
                throw new Error('Mismatch between Token Escrow address and derived OFT Store PDA')
            }

            const oftStoreAccountData = await program.account.oftStore.fetch(oftStoreStr)

            const signerIsAdmin = umiWalletSigner.publicKey.toString() == oftStoreAccountData.admin.toString()
            if (!signerIsAdmin) {
                throw new Error('Your keypair is not the OFT Store admin.')
            }

            // Call the method
            try {
                const tx = await program.methods
                    .renounceFreeze() // Method name
                    .accounts({
                        signer: umiWalletSigner.publicKey,
                        oftStore: oftStorePda,
                        tokenEscrow: tokenEscrowStr,
                        tokenMint: tokenMintStr,
                        currentAuthority: multiSigStr,
                        tokenProgram: TOKEN_PROGRAM_ID.toBase58(), // currently only supports SPL Token standard
                    })
                    .signers([web3JsKeypair])
                    .rpc()

                console.log('Transaction successful:', getExplorerTxLink(tx, eid == EndpointId.SOLANA_V2_TESTNET))
            } catch (err) {
                console.error('Transaction failed:', err)
            }
        }
    )
