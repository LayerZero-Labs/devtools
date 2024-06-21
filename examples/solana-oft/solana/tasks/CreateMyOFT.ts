// Import necessary functions and classes from Solana SDKs

import { 
    Connection,
    Keypair, 
    PublicKey, 
    Transaction, 
    sendAndConfirmTransaction, 
    SystemProgram,
} from '@solana/web3.js';
import { 
    AuthorityType,
    TOKEN_PROGRAM_ID, 
    createInitializeMintInstruction, 
    createSetAuthorityInstruction, 
    getOrCreateAssociatedTokenAccount,
    getMintLen,
    mintTo
} from '@solana/spl-token';
import { getKeypairFromEnvironment, getExplorerLink } from '@solana-developers/helpers';

import { OftTools, OFT_SEED, EXECUTOR_CONFIG_SEED, DVN_CONFIG_SEED, SetConfigType } from '@layerzerolabs/lz-solana-sdk-v2';
import { addressToBytes32, Options } from '@layerzerolabs/lz-v2-utilities';

import 'dotenv/config'

// Connect to the Solana cluster (devnet in this case)
const connection = new Connection('YOUR_RPC_URL', "confirmed");

// const user = getKeypairFromEnvironment('SECRET_KEY');
const OFT_PROGRAM_ID = new PublicKey('YOUR_OFT_PROGRAM_ID');
const walletKeyPair = getKeypairFromEnvironment('PRIVATE_KEY');
const mintKeyPair = Keypair.generate();

async function main() {

    
    // Checks the balance of the OFT.
    async function logBalance(connection: Connection, publicKey: PublicKey, label: string = '') {
        const balance = await connection.getBalance(walletKeyPair.publicKey);
        console.log(`${label} Balance (${publicKey.toBase58()}): ${balance / 1e9} SOL`);
    }

    // Number of local decimals & shared decimals for the token (recommended value is 6)
    const OFT_DECIMALS = 6;

    //
    // 1. MINT NEW SPL TOKEN
    //
    
    const minimumBalanceForMint = await connection.getMinimumBalanceForRentExemption(getMintLen([]));
    let transaction = new Transaction().add(
        SystemProgram.createAccount({
            fromPubkey: walletKeyPair.publicKey,
            newAccountPubkey: mintKeyPair.publicKey,
            space: getMintLen([]),
            lamports: minimumBalanceForMint,
            programId: TOKEN_PROGRAM_ID,
        }),
        await createInitializeMintInstruction(
            mintKeyPair.publicKey, // mint public key
            OFT_DECIMALS, // decimals
            walletKeyPair.publicKey, // mint authority
            null, // freeze authority (not used here)
            TOKEN_PROGRAM_ID // token program id
        )
    );

    await logBalance(connection, walletKeyPair.publicKey, "User");
    await logBalance(connection, mintKeyPair.publicKey, "Mint Account");
    const tokenMint = await sendAndConfirmTransaction(connection, transaction, [walletKeyPair, mintKeyPair], {commitment: `finalized`});
    const link = getExplorerLink('tx', tokenMint, 'testnet');
    console.log(`✅ Token Mint Complete! View the transaction here: ${link}`);

    
    // Create an associated token account for your SPL Token.
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        walletKeyPair,
        mintKeyPair.publicKey,
        walletKeyPair.publicKey,
    );

    // Mint new tokens to your associated token account.
    const oftMint = await mintTo(
        connection,
        walletKeyPair,
        mintKeyPair.publicKey,
        tokenAccount.address,
        walletKeyPair.publicKey,
        1000000000000,
    );

    // Logging outputs for testing purposes.
    console.log(tokenAccount);
    console.log(oftMint);

    // Derive the OFT Config Account from your SPL mint publickey and your OFT Program ID.
    const [oftConfig] = PublicKey.findProgramAddressSync(
        [Buffer.from(OFT_SEED), mintKeyPair.publicKey.toBuffer()],
        OFT_PROGRAM_ID
    );
    console.log(`OFT Config:`, oftConfig);

    //
    // 2. Create a new tx to transfer mint authority to OFT Config Account and initialize a new native OFT.
    //

    transaction = new Transaction().add(
        createSetAuthorityInstruction(
            mintKeyPair.publicKey, // mint public key
            walletKeyPair.publicKey, // current authority
            AuthorityType.MintTokens, // authority type
            oftConfig, // new authority
            [], // multisig owners (none in this case)
            TOKEN_PROGRAM_ID // token program id
        ),
        await OftTools.createInitNativeOftIx(
            walletKeyPair.publicKey, // payer
            walletKeyPair.publicKey, // admin
            mintKeyPair.publicKey, // mint account
            walletKeyPair.publicKey, // OFT Mint Authority
            OFT_DECIMALS, // Shared decimals
            TOKEN_PROGRAM_ID, // SPl Token Program ID
            OFT_PROGRAM_ID // Your OFT Program
        ),
    );

    // Send the transaction to initialize the OFT
    const oftSignature = await sendAndConfirmTransaction(connection, transaction, [walletKeyPair], {commitment: `finalized`});
    const oftLink = getExplorerLink('tx', oftSignature, 'testnet');
    console.log(`✅ OFT Initialization Complete! View the transaction here: ${oftLink}`);

    //
    // 3. SET PEERS
    //

    // Replace with your dstEid's and peerAddresses
    
    // Before setting the peer, we need to convert the EVM peer addresses to bytes32
    const peers = [
        {dstEid: 40231, peerAddress: addressToBytes32('YOUR_PEER_ADDRESS')},
        // ...
    ];
    
    for (const peer of peers) {

        const peerTransaction = new Transaction().add(
            await OftTools.createInitNonceIx(
                walletKeyPair.publicKey,
                peer.dstEid,
                oftConfig,
                peer.peerAddress
            ),
            await OftTools.createSetPeerIx(
                walletKeyPair.publicKey, // admin
                oftConfig, // oft config account
                peer.dstEid, // destination endpoint id
                Array.from(peer.peerAddress), // peer address
                OFT_PROGRAM_ID // Your OFT Program ID
            ),
        );
        
        const peerSignature = await sendAndConfirmTransaction(connection, peerTransaction, [walletKeyPair], {commitment: `finalized`});
        const link = getExplorerLink('tx', peerSignature, 'testnet');
        console.log(
            `✅ You set ${await OftTools.getPeerAddress(connection, oftConfig, peer.dstEid, OFT_PROGRAM_ID)} for dstEid ${peer.dstEid}! View the transaction here: ${link}`,
        );
    }

    //
    // 4. SET ENFORCED OPTIONS
    //

    // In this example you will set a static execution gas _option for every chain.
    // In practice, you will likely want to profile each of your gas settings on the destination chain,
    // and set a custom gas amount depending on the unique gas needs of each destination chain.
    for (const peer of peers) {
        const optionTransaction = new Transaction().add(
            await OftTools.createSetEnforcedOptionsIx(
                walletKeyPair.publicKey, // your admin address
                oftConfig, // your OFT Config
                peer.dstEid, // destination endpoint id for the options to apply to
                Options.newOptions().addExecutorLzReceiveOption(65000, 0).toBytes(), // send options
                Options.newOptions()
                .addExecutorLzReceiveOption(65000, 0)
                .addExecutorComposeOption(0, 50000, 0)
                .toBytes(), // sendAndCall options
                OFT_PROGRAM_ID
            ),
        );
    
        // Send the setEnforcedOptions transaction
        const optionSignature = await sendAndConfirmTransaction(connection, optionTransaction, [walletKeyPair], {commitment: `finalized`});
        const link = getExplorerLink('tx', optionSignature, 'testnet');
        console.log(`✅ You set options for dstEid ${peer.dstEid}! View the transaction here: ${link}`);
    }

    //
    // 5. SET CONFIG
    //

    const dvn1 = new PublicKey("DVN_PROGRAM_ADDRESS");
    const dvn1Config = PublicKey.findProgramAddressSync([Buffer.from(DVN_CONFIG_SEED, 'utf8')], dvn1)[0];
    const uln = new PublicKey("ULN_PROGRAM ADDRESS");
    const executor = new PublicKey("EXECUTOR_PROGRAM_ADDRESS");
    
    const ulnConfig = ({
        confirmations: 100,
        requiredDvnCount: 1,
        optionalDvnCount: 0,
        optionalDvnThreshold: 0,
        requiredDvns: [dvn1Config],
        optionalDvns: [],
    })

    const executorConfig = ({
        executor: PublicKey.findProgramAddressSync([Buffer.from(EXECUTOR_CONFIG_SEED, 'utf8')], executor)[0],
        maxMessageSize: 10000,
    })

    // Assuming `connection` and `user` are already defined and available in the scope
    for (const peer of peers) {
        console.log(peer);
        console.log(`Processing configurations for dstEid: ${peer.dstEid}`);

        // Initialize the send library for the pathway.
        const initSendLibraryTransaction = new Transaction().add(
            await OftTools.createInitSendLibraryIx(
                walletKeyPair.publicKey, 
                oftConfig, 
                peer.dstEid
            )
        )
        
        const initSendLibrarySignature = await sendAndConfirmTransaction(connection, initSendLibraryTransaction, [walletKeyPair], {commitment: `finalized`});
        console.log(`✅ You initialized the send library for dstEid ${peer.dstEid}! View the transaction here: ${initSendLibrarySignature}`);

        // Initialize the receive library for the pathway.
        const initReceiveLibraryTransaction = new Transaction().add(
            await OftTools.createInitReceiveLibraryIx(
                walletKeyPair.publicKey, 
                oftConfig, 
                peer.dstEid
            ),
        )

        const initReceiveLibrarySignature = await sendAndConfirmTransaction(connection, initReceiveLibraryTransaction, [walletKeyPair], {commitment: `finalized`});
        console.log(`✅ You initialized the receive library for dstEid ${peer.dstEid}! View the transaction here: ${initReceiveLibrarySignature}`);

        // Initialize the OFT Config for the pathway.
        const initConfigTransaction = new Transaction().add(
            await OftTools.createInitConfigIx(
                walletKeyPair.publicKey,
                oftConfig,
                peer.dstEid,
                uln
            )
        );

        const initConfigSignature = await sendAndConfirmTransaction(connection, initConfigTransaction, [walletKeyPair], {commitment: `finalized`});
        console.log(`✅ You initialized the config for dstEid ${peer.dstEid}! View the transaction here: ${initConfigSignature}`);
        
        // Set the send library for the pathway.
        const setSendLibraryTransaction = new Transaction().add(
            await OftTools.createSetSendLibraryIx(
                walletKeyPair.publicKey, 
                oftConfig, 
                uln,
                peer.dstEid
            ),
        )
        
        const setSendLibrarySignature = await sendAndConfirmTransaction(connection, setSendLibraryTransaction, [walletKeyPair], {commitment: `finalized`});
        console.log(`✅ You set the send library for dstEid ${peer.dstEid}! View the transaction here: ${setSendLibrarySignature}`);

        // Set the receive library for the pathway.
        const setReceiveLibraryTransaction = new Transaction().add(
            await OftTools.createSetReceiveLibraryIx(
                walletKeyPair.publicKey, 
                oftConfig, 
                uln, 
                peer.dstEid, 
                BigInt(0)
            ),
        )

        const setReceiveLibrarySignature = await sendAndConfirmTransaction(connection, setReceiveLibraryTransaction, [walletKeyPair], {commitment: `finalized`});
        console.log(`✅ You set the receive library for dstEid ${peer.dstEid}! View the transaction here: ${setReceiveLibrarySignature}`);

        // Set the Executor config for the pathway.
        const setExecutorConfigTransaction = new Transaction().add(
            await OftTools.createSetConfigIx(
                connection,
                walletKeyPair.publicKey,
                oftConfig,
                peer.dstEid,
                SetConfigType.EXECUTOR,
                executorConfig,
                uln
            )
        );

        const setExecutorConfigSignature = await sendAndConfirmTransaction(connection, setExecutorConfigTransaction, [walletKeyPair], {commitment: `finalized`});
        console.log(`✅ Set executor configuration for dstEid ${peer.dstEid}! View the transaction here: ${setExecutorConfigSignature}`);

        // Set send uln config for the pathway.
        const setSendUlnConfigTransaction = new Transaction().add(
            await OftTools.createSetConfigIx(
                connection,
                walletKeyPair.publicKey,
                oftConfig,
                peer.dstEid,
                SetConfigType.SEND_ULN,
                ulnConfig,
                uln
            )
        );

        const setSendConfigSignature = await sendAndConfirmTransaction(connection, setSendUlnConfigTransaction, [walletKeyPair], {commitment: `finalized`});
        console.log(`✅ Set send configuration for dstEid ${peer.dstEid}! View the transaction here: ${setSendConfigSignature}`);
        
        // Set the receive uln config for the pathway.
        const setReceiveUlnConfigTransaction = new Transaction().add(
            await OftTools.createSetConfigIx(
                connection,
                walletKeyPair.publicKey,
                oftConfig,
                peer.dstEid,
                SetConfigType.RECEIVE_ULN,
                ulnConfig,
                uln
            )
        );

        const setReceiveConfigSignature = await sendAndConfirmTransaction(connection, setReceiveUlnConfigTransaction, [walletKeyPair], {commitment: `finalized`});
        const link = getExplorerLink("address", setReceiveConfigSignature, "testnet");
        console.log(`✅ Set receive configuration for dstEid ${peer.dstEid}! View the transaction here: ${link}`);
    }

    const rateLimitCapacity = BigInt(20000);
    const rateLimitRefillPerSecond = BigInt(100);
    
    const setRateLimitTransaction = new Transaction().add(
        await OftTools.createSetRateLimitIx(
            walletKeyPair.publicKey,
            oftConfig,
            40231,
            rateLimitCapacity,
            rateLimitRefillPerSecond,
            true,
            OFT_PROGRAM_ID
        ),
    )

    // Send and confirm the send transaction
    const setRateLimitSignature = await sendAndConfirmTransaction(connection, setRateLimitTransaction, [walletKeyPair], {commitment: `finalized`});
    const rateLimitLink = getExplorerLink('tx', setRateLimitSignature, 'testnet');
    console.log(
        `✅ You set a rate limit capacity of ${rateLimitCapacity} with a refill per second of ${rateLimitRefillPerSecond}! View the transaction here: ${rateLimitLink}`,
    );
}

main()