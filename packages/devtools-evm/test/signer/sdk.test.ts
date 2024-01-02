import fc from 'fast-check'
import { endpointArbitrary, pointArbitrary } from '@layerzerolabs/test-devtools'
import { Signer } from '@ethersproject/abstract-signer'
import { OmniSignerEVM } from '@/signer'

describe('signer/sdk', () => {
    const transactionHashArbitrary = fc.hexaString()
    const signedTransactionArbitrary = fc.hexaString()
    const transactionArbitrary = fc.record({
        point: pointArbitrary,
        data: fc.hexaString(),
    })

    describe('OmniSignerEVM', () => {
        describe('sign', () => {
            it('should reject if the eid of the transaction does not match the eid of the signer', async () => {
                await fc.assert(
                    fc.asyncProperty(endpointArbitrary, transactionArbitrary, async (eid, transaction) => {
                        fc.pre(eid !== transaction.point.eid)

                        const signer = {} as Signer
                        const omniSigner = new OmniSignerEVM(eid, signer)

                        await expect(() => omniSigner.sign(transaction)).rejects.toThrow(/Could not use signer/)
                    })
                )
            })

            it('should sign the transaction using the signer if the eids match', async () => {
                await fc.assert(
                    fc.asyncProperty(
                        transactionArbitrary,
                        signedTransactionArbitrary,
                        async (transaction, signedTransaction) => {
                            const signTransaction = jest.fn().mockResolvedValue(signedTransaction)
                            const signer = { signTransaction } as unknown as Signer
                            const omniSigner = new OmniSignerEVM(transaction.point.eid, signer)

                            expect(await omniSigner.sign(transaction)).toBe(signedTransaction)
                            expect(signTransaction).toHaveBeenCalledWith({
                                to: transaction.point.address,
                                data: transaction.data,
                            })
                        }
                    )
                )
            })
        })

        describe('signAndSend', () => {
            it('should reject if the eid of the transaction does not match the eid of the signer', async () => {
                await fc.assert(
                    fc.asyncProperty(endpointArbitrary, transactionArbitrary, async (eid, transaction) => {
                        fc.pre(eid !== transaction.point.eid)

                        const signer = {} as Signer
                        const omniSigner = new OmniSignerEVM(eid, signer)

                        await expect(() => omniSigner.signAndSend(transaction)).rejects.toThrow(/Could not use signer/)
                    })
                )
            })

            it('should send the transaction using the signer if the eids match', async () => {
                await fc.assert(
                    fc.asyncProperty(transactionArbitrary, transactionHashArbitrary, async (transaction, hash) => {
                        const sendTransaction = jest.fn().mockResolvedValue({ hash })
                        const signer = { sendTransaction } as unknown as Signer
                        const omniSigner = new OmniSignerEVM(transaction.point.eid, signer)

                        expect(await omniSigner.signAndSend(transaction)).toEqual({ transactionHash: hash })
                        expect(sendTransaction).toHaveBeenCalledWith({
                            to: transaction.point.address,
                            data: transaction.data,
                        })
                    })
                )
            })
        })
    })
})
