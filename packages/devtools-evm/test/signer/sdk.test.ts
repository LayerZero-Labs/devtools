import fc from 'fast-check'
import { endpointArbitrary, pointArbitrary } from '@layerzerolabs/test-devtools'
import { Signer } from '@ethersproject/abstract-signer'
import { GnosisOmniSignerEVM, OmniSignerEVM } from '@/signer'
import Safe, { SafeConfig } from '@gnosis.pm/safe-core-sdk'
import SafeServiceClient from '@gnosis.pm/safe-service-client'

describe('signer/ethers', () => {
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
    describe('GnosisOmniSignerEVM', () => {
        describe('sign', () => {
            it('should throw', async () => {
                await fc.assert(
                    fc.asyncProperty(endpointArbitrary, transactionArbitrary, async (eid, transaction) => {
                        const signer = {} as Signer
                        const omniSigner = new GnosisOmniSignerEVM(eid, signer, '', {} as SafeConfig)
                        await expect(() => omniSigner.sign(transaction)).rejects.toThrow(/Method not implemented/)
                    })
                )
            })
        })
        describe('signAndSend', () => {
            it('should reject if the eid of the transaction does not match the eid of the signer', async () => {
                await fc.assert(
                    fc.asyncProperty(endpointArbitrary, transactionArbitrary, async (eid, transaction) => {
                        fc.pre(eid !== transaction.point.eid)

                        const signer = {} as Signer
                        const omniSigner = new GnosisOmniSignerEVM(eid, signer, '', {} as SafeConfig)

                        await expect(() => omniSigner.signAndSend(transaction)).rejects.toThrow(/Could not use signer/)
                    })
                )
            })
            it('should send the transaction using the signer if the eids match', async () => {
                await fc.assert(
                    fc.asyncProperty(
                        transactionArbitrary,
                        transactionHashArbitrary,
                        async (transaction, transactionHash) => {
                            const sendTransaction = jest.fn()
                            const getAddress = jest.fn()
                            const signer = { getAddress, sendTransaction } as unknown as Signer
                            const omniSigner = new GnosisOmniSignerEVM(
                                transaction.point.eid,
                                signer,
                                '',
                                {} as SafeConfig
                            )
                            omniSigner['safeSdk'] = {
                                createTransaction: jest.fn(),
                                getTransactionHash: jest.fn().mockResolvedValue(transactionHash),
                                getAddress: jest.fn(),
                            } as unknown as Safe
                            const safeService = (omniSigner['safeService'] = {
                                proposeTransaction: jest.fn(),
                            } as unknown as SafeServiceClient)

                            const result = await omniSigner.signAndSend(transaction)
                            expect(result.transactionHash).toEqual(transactionHash)
                            expect(await result.wait()).toEqual({ transactionHash })
                            expect(safeService.proposeTransaction).toHaveBeenCalledWith({
                                safeAddress: undefined,
                                safeTransaction: undefined,
                                safeTxHash: transactionHash,
                                senderAddress: undefined,
                            })
                        }
                    )
                )
            })
        })
    })
})
