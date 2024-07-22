import fc from 'fast-check'
import { Connection, sendAndConfirmTransaction, SystemProgram, Transaction } from '@solana/web3.js'
import { serializeTransactionMessage, OmniSignerSolana, deserializeTransactionBuffer } from '@/transactions'
import { keypairArbitrary } from '@layerzerolabs/test-devtools-solana'
import { OmniTransaction } from '@layerzerolabs/devtools'
import { endpointArbitrary, solanaAddressArbitrary } from '@layerzerolabs/test-devtools'

jest.mock('@solana/web3.js', () => {
    const original = jest.requireActual('@solana/web3.js')

    return {
        ...original,
        sendAndConfirmTransaction: jest.fn(),
    }
})

const sendAndConfirmTransactionMock = sendAndConfirmTransaction as jest.Mock

describe('transactions/signer', () => {
    beforeEach(() => {
        sendAndConfirmTransactionMock.mockReset()
    })

    describe('sign', () => {
        it('should sign a transaction', async () => {
            await fc.assert(
                fc.asyncProperty(
                    endpointArbitrary,
                    solanaAddressArbitrary,
                    keypairArbitrary,
                    keypairArbitrary,
                    async (eid, address, sender, recipient) => {
                        const transfer = SystemProgram.transfer({
                            fromPubkey: sender.publicKey,
                            toPubkey: recipient.publicKey,
                            lamports: 49,
                        })

                        const connection = new Connection('http://soyllama.com')
                        const omniSigner = new OmniSignerSolana(eid, connection, sender)

                        const transaction = new Transaction().add(transfer)
                        transaction.recentBlockhash = 'EETubP5AKHgjPAhzPAFcb8BAY1hMH639CWCFTqi3hq1k'
                        transaction.feePayer = sender.publicKey

                        const omniTransaction: OmniTransaction = {
                            point: { eid, address },
                            data: serializeTransactionMessage(transaction),
                        }

                        const signature = await omniSigner.sign(omniTransaction)
                        const serializedTransaction = (transaction.sign(sender), transaction.serialize())

                        expect(deserializeTransactionBuffer(signature)).toEqual(serializedTransaction)
                    }
                )
            )
        })
    })

    describe('signAndSend', () => {
        it('should sign and send a transaction', async () => {
            await fc.assert(
                fc.asyncProperty(
                    endpointArbitrary,
                    solanaAddressArbitrary,
                    keypairArbitrary,
                    keypairArbitrary,
                    fc.string(),
                    async (eid, address, sender, recipient, transactionHash) => {
                        sendAndConfirmTransactionMock.mockResolvedValue(transactionHash)

                        const transfer = SystemProgram.transfer({
                            fromPubkey: sender.publicKey,
                            toPubkey: recipient.publicKey,
                            lamports: 49,
                        })

                        const connection = new Connection('http://soyllama.com')
                        const omniSigner = new OmniSignerSolana(eid, connection, sender)

                        const transaction = new Transaction().add(transfer)
                        transaction.recentBlockhash = 'EETubP5AKHgjPAhzPAFcb8BAY1hMH639CWCFTqi3hq1k'
                        transaction.feePayer = sender.publicKey

                        const omniTransaction: OmniTransaction = {
                            point: { eid, address },
                            data: serializeTransactionMessage(transaction),
                        }

                        const response = await omniSigner.signAndSend(omniTransaction)
                        expect(response).toEqual({
                            transactionHash,
                            wait: expect.any(Function),
                        })

                        expect(await response.wait()).toEqual({ transactionHash })
                    }
                )
            )
        })
    })
})
