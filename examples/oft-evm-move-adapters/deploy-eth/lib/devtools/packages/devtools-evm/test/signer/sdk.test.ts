import fc from 'fast-check'
import { endpointArbitrary, evmAddressArbitrary, optionalArbitrary, pointArbitrary } from '@layerzerolabs/test-devtools'
import { Signer } from '@ethersproject/abstract-signer'
import { GnosisOmniSignerEVM, OmniSignerEVM } from '@/signer'
import Safe from '@safe-global/protocol-kit'
import SafeApiKit from '@safe-global/api-kit'
import { OperationType } from '@safe-global/safe-core-sdk-types'

describe('signer/ethers', () => {
    const transactionHashArbitrary = fc.hexaString()
    const signedTransactionArbitrary = fc.hexaString()
    const transactionArbitrary = fc.record({
        point: pointArbitrary,
        data: fc.hexaString(),
        value: optionalArbitrary(fc.integer({ min: 0 })),
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
                                value: transaction.value,
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
                            value: transaction.value,
                        })
                    })
                )
            })
        })
    })
    describe('GnosisOmniSignerEVM', () => {
        describe('sign', () => {
            it('should not be supported', async () => {
                await fc.assert(
                    fc.asyncProperty(
                        evmAddressArbitrary,
                        endpointArbitrary,
                        transactionArbitrary,
                        async (safeAddress, eid, transaction) => {
                            const signer = {} as Signer

                            const apiKit = {
                                getNextNonce: jest.fn(),
                            } as unknown as SafeApiKit

                            const safe = {
                                createTransaction: jest.fn().mockResolvedValue({ data: 'transaction' }),
                                getAddress: jest.fn().mockResolvedValue(safeAddress),
                                signTransaction: jest.fn().mockResolvedValue({ data: { data: '0xsigned' } }),
                            } as unknown as Safe

                            const omniSigner = new GnosisOmniSignerEVM(eid, signer, '', {}, undefined, apiKit, safe)

                            await expect(omniSigner.sign(transaction)).rejects.toThrow(
                                /Signing transactions with safe is currently not supported, use signAndSend instead/
                            )
                        }
                    )
                )
            })
        })

        describe('signAndSend', () => {
            it('should reject if the eid of the transaction does not match the eid of the signer', async () => {
                await fc.assert(
                    fc.asyncProperty(
                        evmAddressArbitrary,
                        endpointArbitrary,
                        transactionArbitrary,
                        async (safeAddress, eid, transaction) => {
                            fc.pre(eid !== transaction.point.eid)

                            const signer = {} as Signer
                            const safe = {
                                createTransaction: jest.fn().mockResolvedValue({ data: 'transaction' }),
                                getAddress: jest.fn().mockResolvedValue(safeAddress),
                                signTransactionHash: jest.fn().mockResolvedValue({ data: 'signature' }),
                            } as unknown as Safe
                            const omniSigner = new GnosisOmniSignerEVM(eid, signer, '', {}, undefined, undefined, safe)

                            await expect(() => omniSigner.signAndSend(transaction)).rejects.toThrow(
                                /Could not use signer/
                            )
                        }
                    )
                )
            })

            it('should send the transaction using the signer if the eids match', async () => {
                await fc.assert(
                    fc.asyncProperty(
                        evmAddressArbitrary,
                        transactionArbitrary,
                        transactionHashArbitrary,
                        async (safeAddress, transaction, transactionHash) => {
                            const signer = { getAddress: jest.fn(), sendTransaction: jest.fn() } as unknown as Signer
                            const apiKit = {
                                proposeTransaction: jest.fn(),
                                getNextNonce: jest.fn(),
                            } as unknown as SafeApiKit
                            const safe = {
                                createTransaction: jest.fn().mockResolvedValue({ data: 'transaction' }),
                                getTransactionHash: jest.fn().mockResolvedValue(transactionHash),
                                getAddress: jest.fn().mockResolvedValue(safeAddress),
                                signTransactionHash: jest.fn().mockResolvedValue({ data: 'signature' }),
                            } as unknown as Safe

                            const omniSigner = new GnosisOmniSignerEVM(
                                transaction.point.eid,
                                signer,
                                '',
                                {
                                    safeAddress,
                                },
                                undefined,
                                apiKit,
                                safe
                            )

                            const result = await omniSigner.signAndSend(transaction)
                            expect(result.transactionHash).toEqual(transactionHash)

                            expect(await result.wait()).toEqual({ transactionHash })

                            expect(apiKit.getNextNonce).toHaveBeenCalledWith(safeAddress)
                            expect(apiKit.proposeTransaction).toHaveBeenCalledWith({
                                safeAddress,
                                safeTransactionData: 'transaction',
                                safeTxHash: transactionHash,
                                senderAddress: undefined,
                                senderSignature: 'signature',
                            })
                        }
                    )
                )
            })
        })

        describe('signAndSendBatch', () => {
            it('should reject with no transactions', async () => {
                await fc.assert(
                    fc.asyncProperty(evmAddressArbitrary, endpointArbitrary, async (safeAddress, eid) => {
                        const signer = {} as Signer
                        const safe = {} as unknown as Safe
                        const omniSigner = new GnosisOmniSignerEVM(eid, signer, '', {}, undefined, undefined, safe)

                        await expect(() => omniSigner.signAndSendBatch([])).rejects.toThrow(
                            /signAndSendBatch received 0 transactions/
                        )
                    })
                )
            })

            it('should reject if at least one of the transaction eids do not match the signer eid', async () => {
                await fc.assert(
                    fc.asyncProperty(
                        evmAddressArbitrary,
                        endpointArbitrary,
                        fc.array(transactionArbitrary, { minLength: 1 }),
                        async (safeAddress, eid, transactions) => {
                            fc.pre(transactions.some((transaction) => eid !== transaction.point.eid))

                            const signer = {} as Signer
                            const safe = {
                                createTransaction: jest.fn().mockResolvedValue({ data: 'transaction' }),
                                getAddress: jest.fn().mockResolvedValue(safeAddress),
                                signTransactionHash: jest.fn().mockResolvedValue({ data: 'signature' }),
                            } as unknown as Safe
                            const omniSigner = new GnosisOmniSignerEVM(eid, signer, '', {}, undefined, undefined, safe)

                            await expect(() => omniSigner.signAndSendBatch(transactions)).rejects.toThrow(
                                /Could not use signer/
                            )
                        }
                    )
                )
            })

            it('should send the transaction using the signer if the eids match', async () => {
                await fc.assert(
                    fc.asyncProperty(
                        evmAddressArbitrary,
                        endpointArbitrary,
                        fc.array(transactionArbitrary, { minLength: 1 }),
                        transactionHashArbitrary,
                        async (safeAddress, eid, transactions, transactionHash) => {
                            const nonce = 17
                            const signer = { getAddress: jest.fn(), sendTransaction: jest.fn() } as unknown as Signer
                            const apiKit = {
                                proposeTransaction: jest.fn(),
                                getNextNonce: jest.fn().mockResolvedValue(nonce),
                            } as unknown as SafeApiKit
                            const safe = {
                                createTransaction: jest.fn().mockResolvedValue({ data: 'transaction' }),
                                getTransactionHash: jest.fn().mockResolvedValue(transactionHash),
                                getAddress: jest.fn().mockResolvedValue(safeAddress),
                                signTransactionHash: jest.fn().mockResolvedValue({ data: 'signature' }),
                            } as unknown as Safe

                            const omniSigner = new GnosisOmniSignerEVM(
                                eid,
                                signer,
                                '',
                                {
                                    safeAddress,
                                },
                                undefined,
                                apiKit,
                                safe
                            )

                            const transactionsWithMatchingEids = transactions.map((t) => ({
                                ...t,
                                point: { ...t.point, eid },
                            }))

                            const result = await omniSigner.signAndSendBatch(transactionsWithMatchingEids)
                            expect(result.transactionHash).toEqual(transactionHash)

                            expect(await result.wait()).toEqual({ transactionHash })

                            expect(safe.createTransaction).toHaveBeenCalledWith({
                                safeTransactionData: transactions.map((t) => ({
                                    to: t.point.address,
                                    data: t.data,
                                    value: String(t.value ?? 0),
                                    operation: OperationType.Call,
                                })),
                                options: { nonce },
                            })

                            expect(apiKit.getNextNonce).toHaveBeenCalledWith(safeAddress)
                            expect(apiKit.proposeTransaction).toHaveBeenCalledWith({
                                safeAddress,
                                safeTransactionData: 'transaction',
                                safeTxHash: transactionHash,
                                senderAddress: undefined,
                                senderSignature: 'signature',
                            })
                        }
                    )
                )
            })
        })
    })
})
