import fc from 'fast-check'
import { Connection, sendAndConfirmTransaction, SystemProgram, Transaction } from '@solana/web3.js'
import { keypairArbitrary, solanaBlockhashArbitrary } from '@layerzerolabs/test-devtools-solana'
import { endpointArbitrary, solanaAddressArbitrary } from '@layerzerolabs/test-devtools'
import { OmniSDK } from '@/omnigraph'

jest.mock('@solana/web3.js', () => {
    const original = jest.requireActual('@solana/web3.js')

    return {
        ...original,
        sendAndConfirmTransaction: jest.fn(),
    }
})

const sendAndConfirmTransactionMock = sendAndConfirmTransaction as jest.Mock

describe('omnigraph/sdk', () => {
    beforeEach(() => {
        sendAndConfirmTransactionMock.mockReset()
    })

    describe('createTransaction', () => {
        it('should add a feePayer and the latest block hash to the transaction', async () => {
            await fc.assert(
                fc.asyncProperty(
                    endpointArbitrary,
                    solanaAddressArbitrary,
                    keypairArbitrary,
                    keypairArbitrary,
                    solanaBlockhashArbitrary,
                    async (eid, address, sender, recipient, blockhash) => {
                        class TestOmniSDK extends OmniSDK {
                            test() {
                                const transfer = SystemProgram.transfer({
                                    fromPubkey: sender.publicKey,
                                    toPubkey: recipient.publicKey,
                                    lamports: 49,
                                })
                                const transaction = new Transaction().add(transfer)

                                return this.createTransaction(transaction)
                            }
                        }

                        const connection = new Connection('http://soyllama.com')
                        jest.spyOn(connection, 'getLatestBlockhash').mockResolvedValue({
                            blockhash,
                            lastValidBlockHeight: NaN,
                        })

                        const sdk = new TestOmniSDK(connection, { eid, address }, sender.publicKey)
                        const omniTransaction = await sdk.test()

                        expect(omniTransaction).toEqual({
                            data: expect.any(String),
                            point: { eid, address },
                        })
                    }
                )
            )
        })
    })
})
