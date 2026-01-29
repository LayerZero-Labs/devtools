import {
    UpdateV1InstructionAccounts,
    UpdateV1InstructionArgs,
    fetchMetadataFromSeeds,
    safeFetchMetadataFromSeeds,
    updateV1,
} from '@metaplex-foundation/mpl-token-metadata'
import { publicKey, transactionBuilder } from '@metaplex-foundation/umi'
import { toWeb3JsTransaction } from '@metaplex-foundation/umi-web3js-adapters'
import {
    TOKEN_2022_PROGRAM_ID,
    TOKEN_PROGRAM_ID,
    createUpdateFieldInstruction,
    getTokenMetadata,
} from '@solana/spl-token'
import { Keypair, PublicKey, SystemProgram, TransactionMessage, VersionedTransaction } from '@solana/web3.js'
import bs58 from 'bs58'
import { task } from 'hardhat/config'

import { types as devtoolsTypes } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'

import { deriveConnection, getExplorerTxLink } from './index'

interface UpdateMetadataTaskArgs {
    eid: EndpointId
    name: string
    mint: string
    sellerFeeBasisPoints: number
    symbol: string
    uri: string
    vaultPda: string
}

// Auto-detects metadata type:
// - SPL Token mints (TOKEN_PROGRAM_ID) -> always use Metaplex metadata
// - Token-2022 mints -> probe for Metaplex metadata PDA first; if exists, use Metaplex; otherwise use Token Extensions
//
// Example:
// pnpm hardhat lz:oft:solana:update-metadata --eid <EID> --mint <MINT_ADDRESS> --name <NEW_TOKEN_NAME>
// If Update Authority is a multisig (Vault PDA):
// pnpm hardhat lz:oft:solana:update-metadata --eid <EID> --mint <MINT_ADDRESS> --name <NEW_TOKEN_NAME> --vault-pda <VAULT_ADDRESS>
task(
    'lz:oft:solana:update-metadata',
    'Updates the metadata of the SPL Token (auto-detects Metaplex or Token Extensions)'
)
    .addParam('eid', 'Solana mainnet (30168) or testnet (40168)', undefined, devtoolsTypes.eid)
    .addParam('mint', 'The Token mint public key', undefined, devtoolsTypes.string)
    .addOptionalParam('name', 'Token Name', undefined, devtoolsTypes.string)
    .addOptionalParam('symbol', 'Token Symbol', undefined, devtoolsTypes.string)
    .addOptionalParam('sellerFeeBasisPoints', 'Seller fee basis points (Metaplex only)', undefined, devtoolsTypes.int)
    .addOptionalParam('uri', 'URI for token metadata', undefined, devtoolsTypes.string)
    .addOptionalParam('vaultPda', 'The Vault PDA public key (update authority)', undefined, devtoolsTypes.string)
    .setAction(
        async ({ eid, name, mint: mintStr, sellerFeeBasisPoints, symbol, uri, vaultPda }: UpdateMetadataTaskArgs) => {
            const isTestnet = eid == EndpointId.SOLANA_V2_TESTNET

            const { umi, connection } = await deriveConnection(eid)
            const mintPubkey = new PublicKey(mintStr)
            const mintAccountInfo = await connection.getAccountInfo(mintPubkey)

            if (!mintAccountInfo) {
                throw new Error(`Mint account not found: ${mintStr}`)
            }

            const mintOwner = mintAccountInfo.owner.toBase58()

            if (mintOwner === TOKEN_PROGRAM_ID.toBase58()) {
                // SPL Token mints always use Metaplex metadata
                console.log('Detected SPL Token mint, using Metaplex metadata')
                await updateMetaplexMetadata({
                    eid,
                    mintStr,
                    name,
                    symbol,
                    uri,
                    sellerFeeBasisPoints,
                    vaultPda,
                    isTestnet,
                })
            } else if (mintOwner === TOKEN_2022_PROGRAM_ID.toBase58()) {
                // Token-2022 mints could use either Metaplex or Token Extensions metadata
                // Probe for Metaplex metadata PDA first
                const metaplexMetadata = await safeFetchMetadataFromSeeds(umi, { mint: publicKey(mintStr) })

                if (metaplexMetadata) {
                    console.log('Detected Token-2022 mint with Metaplex metadata')
                    await updateMetaplexMetadata({
                        eid,
                        mintStr,
                        name,
                        symbol,
                        uri,
                        sellerFeeBasisPoints,
                        vaultPda,
                        isTestnet,
                    })
                } else {
                    console.log('Detected Token-2022 mint with Token Extensions metadata')
                    await updateTokenExtensionsMetadata({
                        eid,
                        mintStr,
                        name,
                        symbol,
                        uri,
                        vaultPda,
                        isTestnet,
                    })
                }
            } else {
                throw new Error(`Unknown mint owner program: ${mintOwner}`)
            }
        }
    )

async function updateMetaplexMetadata({
    eid,
    mintStr,
    name,
    symbol,
    uri,
    sellerFeeBasisPoints,
    vaultPda,
    isTestnet,
}: {
    eid: EndpointId
    mintStr: string
    name?: string
    symbol?: string
    uri?: string
    sellerFeeBasisPoints?: number
    vaultPda?: string
    isTestnet: boolean
}) {
    const { umi, umiWalletSigner } = await deriveConnection(eid, {
        noopSigner: vaultPda ? publicKey(vaultPda) : undefined,
    })

    const mint = publicKey(mintStr)

    const initialMetadata = await fetchMetadataFromSeeds(umi, { mint })

    if (!vaultPda && initialMetadata.updateAuthority !== umiWalletSigner.publicKey.toString()) {
        throw new Error('Only the update authority can update the metadata')
    }

    if (vaultPda && initialMetadata.updateAuthority !== publicKey(vaultPda).toString()) {
        throw new Error('Provided vaultPda is not the current update authority on this metadata')
    }

    if (initialMetadata.isMutable == false) {
        throw new Error('Metadata is not mutable')
    }

    const updateV1Args: UpdateV1InstructionAccounts & UpdateV1InstructionArgs = {
        mint,
        authority: umiWalletSigner,
        data: {
            ...initialMetadata,
            name: name || initialMetadata.name,
            symbol: symbol || initialMetadata.symbol,
            uri: uri || initialMetadata.uri,
            sellerFeeBasisPoints:
                sellerFeeBasisPoints != undefined ? sellerFeeBasisPoints : initialMetadata.sellerFeeBasisPoints,
        },
    }
    const updateIxn = updateV1(umi, updateV1Args)
    const txBuilder = transactionBuilder().add(updateIxn)
    if (vaultPda) {
        txBuilder.setFeePayer(umiWalletSigner).useV0()
        // Include a recent blockhash before building
        const web3JsTxn = toWeb3JsTransaction(await txBuilder.buildWithLatestBlockhash(umi))
        const base58 = bs58.encode(new Uint8Array(web3JsTxn.message.serialize()))
        console.log('==== Import the following base58 txn data into the Squads UI ====')
        console.log(base58)
        // output txn data as base58
    } else {
        // submit the txn
        const createTokenTx = await txBuilder.sendAndConfirm(umi)
        console.log(`Transaction: ${getExplorerTxLink(bs58.encode(createTokenTx.signature), isTestnet)}`)
    }
}

async function updateTokenExtensionsMetadata({
    eid,
    mintStr,
    name,
    symbol,
    uri,
    vaultPda,
    isTestnet,
}: {
    eid: EndpointId
    mintStr: string
    name?: string
    symbol?: string
    uri?: string
    vaultPda?: string
    isTestnet: boolean
}) {
    const { connection } = await deriveConnection(eid)

    // Get the keypair from environment
    const privateKeyStr = process.env.SOLANA_PRIVATE_KEY
    if (!privateKeyStr && !vaultPda) {
        throw new Error('SOLANA_PRIVATE_KEY environment variable is required for non-multisig transactions')
    }

    const keypair = privateKeyStr ? Keypair.fromSecretKey(bs58.decode(privateKeyStr)) : undefined
    const mintPubkey = new PublicKey(mintStr)
    const expectedAuthority = vaultPda ? new PublicKey(vaultPda) : keypair!.publicKey

    // Fetch Token Extensions metadata to verify update authority
    const tokenMetadata = await getTokenMetadata(connection, mintPubkey, 'confirmed', TOKEN_2022_PROGRAM_ID)
    if (!tokenMetadata) {
        throw new Error(`Token Extensions metadata not found for mint: ${mintStr}`)
    }

    // Verify update authority
    if (!tokenMetadata.updateAuthority) {
        throw new Error('Metadata has no update authority set (metadata is immutable)')
    }
    if (tokenMetadata.updateAuthority.toBase58() !== expectedAuthority.toBase58()) {
        throw new Error(
            `Update authority mismatch. Expected: ${expectedAuthority.toBase58()}, Actual: ${tokenMetadata.updateAuthority.toBase58()}`
        )
    }

    // Get current mint account info to calculate rent difference
    const mintAccountInfo = await connection.getAccountInfo(mintPubkey)
    if (!mintAccountInfo) {
        throw new Error(`Mint account not found: ${mintStr}`)
    }

    // Build instructions for each field that needs updating
    const instructions = []

    // Calculate additional bytes needed for new values and add rent if needed
    // Token Extensions metadata may need more space when updating to longer values
    // Estimate new total size: current size + length increases for each field
    // Add a buffer of 100 bytes to be safe
    const estimatedNewSize =
        mintAccountInfo.data.length + (name?.length ?? 0) + (symbol?.length ?? 0) + (uri?.length ?? 0) + 100
    const rentExemptLamports = await connection.getMinimumBalanceForRentExemption(estimatedNewSize)
    const currentLamports = mintAccountInfo.lamports
    const additionalLamports = rentExemptLamports - currentLamports

    if (additionalLamports > 0) {
        if (vaultPda) {
            // For multisig, include rent transfer from vault to mint
            console.log(`Adding ${additionalLamports} lamports rent transfer from vault to mint`)
            instructions.push(
                SystemProgram.transfer({
                    fromPubkey: new PublicKey(vaultPda),
                    toPubkey: mintPubkey,
                    lamports: additionalLamports,
                })
            )
        } else {
            console.log(`Adding ${additionalLamports} lamports for additional rent`)
            instructions.push(
                SystemProgram.transfer({
                    fromPubkey: keypair!.publicKey,
                    toPubkey: mintPubkey,
                    lamports: additionalLamports,
                })
            )
        }
    }

    if (name) {
        instructions.push(
            createUpdateFieldInstruction({
                programId: TOKEN_2022_PROGRAM_ID,
                metadata: mintPubkey,
                updateAuthority: expectedAuthority,
                field: 'name',
                value: name,
            })
        )
    }

    if (symbol) {
        instructions.push(
            createUpdateFieldInstruction({
                programId: TOKEN_2022_PROGRAM_ID,
                metadata: mintPubkey,
                updateAuthority: expectedAuthority,
                field: 'symbol',
                value: symbol,
            })
        )
    }

    if (uri) {
        instructions.push(
            createUpdateFieldInstruction({
                programId: TOKEN_2022_PROGRAM_ID,
                metadata: mintPubkey,
                updateAuthority: expectedAuthority,
                field: 'uri',
                value: uri,
            })
        )
    }

    if (instructions.length === 0) {
        throw new Error('At least one of --name, --symbol, or --uri must be provided')
    }

    const { blockhash } = await connection.getLatestBlockhash()

    const message = new TransactionMessage({
        payerKey: vaultPda ? expectedAuthority : keypair!.publicKey,
        recentBlockhash: blockhash,
        instructions,
    }).compileToV0Message()

    const transaction = new VersionedTransaction(message)

    if (vaultPda) {
        const base58Tx = bs58.encode(transaction.message.serialize())
        console.log('==== Import the following base58 txn data into the Squads UI ====')
        console.log(base58Tx)
    } else {
        // Sign and send the transaction
        transaction.sign([keypair!])
        const signature = await connection.sendTransaction(transaction)
        await connection.confirmTransaction(signature, 'confirmed')
        console.log(`Transaction: ${getExplorerTxLink(signature, isTestnet)}`)
    }
}
