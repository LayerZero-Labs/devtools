import { AnchorProvider, Program } from '@coral-xyz/anchor'
import NodeWallet from '@coral-xyz/anchor/dist/cjs/nodewallet'
import { TOKEN_PROGRAM_ID, getMint } from '@solana/spl-token'
import { task } from 'hardhat/config'

import { types } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'

import { deriveConnection, getExplorerTxLink } from './index'

interface Args {
    eid: EndpointId
    programId: string
    oftStore: string
    computeUnitPriceScaleFactor: number
}

// TODO: no need to pass in oft store? since we can derive
task('lz:oft:solana:renounce-freeze', 'Renounce freeze authority for an OFT token')
    .addParam('eid', 'The endpoint ID', undefined, types.eid)
    .addParam('programId', 'The OFT program ID', undefined, types.string)
    .addParam('oftStore', 'The OFT Store public key', undefined, types.string)
    .addParam('computeUnitPriceScaleFactor', 'The compute unit price scale factor', 4, types.float, true)
    .setAction(async ({ eid, programId: programIdStr, oftStore: oftStoreStr, computeUnitPriceScaleFactor }: Args) => {
        const { connection, umiWalletSigner, web3JsKeypair } = await deriveConnection(eid)

        // TODO: clean up below block
        const wallet = new NodeWallet(web3JsKeypair)
        const provider = new AnchorProvider(connection, wallet, {
            commitment: 'processed',
        })

        const IDL = await import('../../target/idl/oft.json').then((module) => module.default)
        const types = await import('../../target/types/oft').then((module) => module)

        // @ts-expect-error we can ignore the IDL type error, which is a quick or Anchor
        const program = new Program<typeof types.IDL>(IDL, programIdStr, provider)

        const oftStoreAccount = await program.account.oftStore.fetch(oftStoreStr)
        const tokenMint = oftStoreAccount.tokenMint

        const mintAccount = await getMint(connection, tokenMint) // to support Token-2022, pass in program ID as third param here

        // we assume that the mint authority is set to the multisig
        const multisig = mintAccount.mintAuthority

        if (!multisig) {
            throw new Error('Mint authority is not set.')
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
                    oftStore: oftStoreStr,
                    tokenMint: tokenMint,
                    currentAuthority: multisig,
                    tokenProgram: TOKEN_PROGRAM_ID.toBase58(), // currently only supports SPL Token standard
                })
                .signers([web3JsKeypair])
                .rpc()

            console.log('Transaction successful:', getExplorerTxLink(tx, eid == EndpointId.SOLANA_V2_TESTNET))
        } catch (err) {
            console.error('Transaction failed:', err)
        }
    })
