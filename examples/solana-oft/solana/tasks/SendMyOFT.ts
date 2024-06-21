// Import necessary functions and classes from Solana SDKs
import { 
    Connection,
    PublicKey, 
    Transaction, 
    sendAndConfirmTransaction,
} from '@solana/web3.js';
import { getKeypairFromEnvironment, getExplorerLink } from '@solana-developers/helpers';

import { 
    TOKEN_PROGRAM_ID,
    getOrCreateAssociatedTokenAccount 
} from '@solana/spl-token';
import { OftTools, OFT_SEED } from '@layerzerolabs/lz-solana-sdk-v2';
import { addressToBytes32, Options } from '@layerzerolabs/lz-v2-utilities';

import 'dotenv/config'

// Connect to the Solana cluster (devnet in this case)
const connection = new Connection("YOUR_RPC_URL", "confirmed");

// const user = getKeypairFromEnvironment('SECRET_KEY');
const OFT_PROGRAM_ID = new PublicKey("YOUR_OFT_PROGRAM_ID");
const walletKeyPair = getKeypairFromEnvironment('PRIVATE_KEY');
const mintPublicKey = new PublicKey("YOUR_SPL_TOKEN");

let peers: {
    dstEid: number;
    peerAddress: Uint8Array;
}[] = [];

peers = [
    {dstEid: 40231, peerAddress: addressToBytes32('YOUR_PEER_ADDRESS')},
    // ...
];

async function main() {

    // Derive the tokenAccounts
    const tokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        walletKeyPair,
        mintPublicKey,
        walletKeyPair.publicKey,
        true,
        'finalized'
    );

    // Derive the oftConfig
    const [oftConfig] = PublicKey.findProgramAddressSync(
        [Buffer.from(OFT_SEED), mintPublicKey.toBuffer()],
        OFT_PROGRAM_ID
    );

    // Define your receiver address (typically bytes20 for evm addresses)
    const receiver = addressToBytes32('YOUR_RECEIVER_ADDRESS');
    // Define your amount to send in big number format
    const amountToSend = BigInt(20000);
    console.log(OFT_PROGRAM_ID);
    const fee = await OftTools.quoteWithUln(
        connection,
        walletKeyPair.publicKey, // the payer's address
        mintPublicKey, // your token mint account
        40231, // the dstEid
        amountToSend, // the amount of tokens to send
        amountToSend, // the minimum amount of tokens to send (for slippage)
        Options.newOptions().addExecutorLzReceiveOption(0, 0).toBytes(), // any extra execution options to add on top of enforced
        Array.from(receiver), // the receiver's address in bytes32
        false,
        undefined,
        undefined,
        undefined,
        undefined,
        TOKEN_PROGRAM_ID,
        OFT_PROGRAM_ID
    );

    console.log(fee);

    // Create the send transaction
    const sendTransaction = new Transaction().add(

        await OftTools.sendWithUln(
            connection, // your connection
            walletKeyPair.publicKey, // payer address
            mintPublicKey, // token mint address
            tokenAccount.address, // associated token address
            peers[0].dstEid, // destination endpoint id
            amountToSend, // amount of tokens to send
            amountToSend, // minimum amount of tokens to send (for slippage)
            Options.newOptions().addExecutorLzReceiveOption(0, 0).toBytes(), // extra options to send
            Array.from(receiver), // receiver address
            fee.nativeFee, // native fee to pay (using quote)
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            OFT_PROGRAM_ID
        ),
    );
  
    // Send and confirm the send transaction
    const sendSignature = await sendAndConfirmTransaction(connection, sendTransaction, [walletKeyPair], {commitment: `finalized`});
    const sendLink = getExplorerLink('tx', sendSignature, 'testnet');
    console.log(
        `✅ You sent ${amountToSend} to dstEid ${peers[0].dstEid}! View the transaction here: ${sendLink}`,
    );
}

main()