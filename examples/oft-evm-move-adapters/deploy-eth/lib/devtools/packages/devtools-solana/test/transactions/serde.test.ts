import fc from 'fast-check'
import { SystemProgram, Transaction } from '@solana/web3.js'
import { serializeTransactionMessage, deserializeTransactionMessage } from '@/transactions'
import { keypairArbitrary } from '@layerzerolabs/test-devtools-solana'

describe('transactions/serde', () => {
    describe('serializeTransactionMessage / deserializeTransactionMessage', () => {
        it('should work', async () => {
            await fc.assert(
                fc.asyncProperty(keypairArbitrary, keypairArbitrary, async (sender, recipient) => {
                    const transfer = SystemProgram.transfer({
                        fromPubkey: sender.publicKey,
                        toPubkey: recipient.publicKey,
                        lamports: 49,
                    })

                    const transaction = new Transaction().add(transfer)

                    // Transaction in Solana require a recent block hash to be set in order for them to be serialized
                    transaction.recentBlockhash = 'EETubP5AKHgjPAhzPAFcb8BAY1hMH639CWCFTqi3hq1k'

                    // Transactions in Solana require a fee payer to be set in order for them to be serialized
                    transaction.feePayer = sender.publicKey

                    // First we serialize the transaction
                    const serializedTransaction = serializeTransactionMessage(transaction)
                    // Then we deserialize it
                    const deserializedTransaction = deserializeTransactionMessage(serializedTransaction)
                    // And check that the fields match the original transaction
                    //
                    // The reason why we don't compare the transactions directly is that the signers will not match
                    // after deserialization (the signers get stripped out of the original transaction)
                    expect(deserializedTransaction.instructions).toEqual(transaction.instructions)
                    expect(deserializedTransaction.recentBlockhash).toEqual(transaction.recentBlockhash)
                    expect(deserializedTransaction.feePayer).toEqual(transaction.feePayer)

                    // Now we serialize the deserialized transaction again and check that it fully matches the serialized transaction
                    const reserializedTransaction = serializeTransactionMessage(deserializedTransaction)
                    expect(reserializedTransaction).toEqual(serializedTransaction)
                })
            )
        })
    })
})
