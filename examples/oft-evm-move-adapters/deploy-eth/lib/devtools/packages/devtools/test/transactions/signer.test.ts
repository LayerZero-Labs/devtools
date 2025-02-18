import fc from 'fast-check'
import { pointArbitrary } from '@layerzerolabs/test-devtools'
import {
    OmniSignerFactory,
    OmniTransaction,
    OmniTransactionResponse,
    createSignAndSend,
    groupTransactionsByEid,
} from '@/transactions'
import { formatEid } from '@/omnigraph'
import { EndpointId } from '@layerzerolabs/lz-definitions'

describe('transactions/signer', () => {
    const transactionArbitrary: fc.Arbitrary<OmniTransaction> = fc.record({
        point: pointArbitrary,
        data: fc.hexaString(),
    })

    describe('createSignAndSend', () => {
        describe.each(['', '1'])(
            `when LZ_ENABLE_EXPERIMENTAL_BATCHED_WAIT environment variable is set to '%s'`,
            (LZ_ENABLE_EXPERIMENTAL_BATCHED_WAIT) => {
                beforeAll(() => {
                    process.env.LZ_ENABLE_EXPERIMENTAL_BATCHED_WAIT = LZ_ENABLE_EXPERIMENTAL_BATCHED_WAIT
                })

                afterAll(() => {
                    process.env.LZ_ENABLE_EXPERIMENTAL_BATCHED_WAIT = LZ_ENABLE_EXPERIMENTAL_BATCHED_WAIT
                })

                it('should return no successes and no errors when called with an empty array', async () => {
                    const signAndSend = jest.fn().mockRejectedValue('Oh no')
                    const sign = jest.fn().mockRejectedValue('Oh god no')
                    // @ts-expect-error we don't care about the implementation here
                    const signerFactory: OmniSignerFactory = () => ({ signAndSend, sign })
                    const signAndSendTransactions = createSignAndSend(signerFactory)

                    expect(await signAndSendTransactions([])).toEqual([[], [], []])

                    expect(signAndSend).not.toHaveBeenCalled()
                    expect(sign).not.toHaveBeenCalled()
                })

                it('should return the first transaction as failed if createSigner fails', async () => {
                    await fc.assert(
                        fc.asyncProperty(fc.array(transactionArbitrary), async (transactions) => {
                            const signerFactory: OmniSignerFactory = jest
                                .fn()
                                .mockImplementation((eid: EndpointId) => Promise.reject(new Error(`So sorry ${eid}`)))
                            const signAndSendTransactions = createSignAndSend(signerFactory)

                            // Now we send all the transactions to the flow and observe the output
                            const [successful, errors, pending] = await signAndSendTransactions(transactions)

                            const grouped = groupTransactionsByEid(transactions)

                            // We expect none of the transactions to go through
                            expect(successful).toEqual([])
                            // We expect the errors to contain the first transaction and the wrapped error from the signer factory
                            expect(errors).toEqual(
                                Array.from(grouped.entries()).map(([eid, transactions]) => ({
                                    error: new Error(
                                        `Failed to create a signer for ${formatEid(eid)}: ${new Error(`So sorry ${eid}`)}`
                                    ),
                                    transaction: transactions[0],
                                }))
                            )
                            // And we expect all the transactions to be pending
                            expect(pending).toContainAllValues(
                                Array.from(grouped.entries()).flatMap(([, transactions]) => transactions)
                            )
                        })
                    )
                })

                it('should return all successful transactions if they all go through', async () => {
                    await fc.assert(
                        fc.asyncProperty(fc.array(transactionArbitrary), async (transactions) => {
                            // We'll prepare some mock objects for this test
                            // to mock the transaction responses and receipts
                            const receipt = { transactionHash: '0x0' }

                            // Our successful wait will produce a receipt
                            const successfulWait = jest.fn().mockResolvedValue(receipt)
                            const successfulResponse: OmniTransactionResponse = {
                                transactionHash: '0x0',
                                wait: successfulWait,
                            }

                            // Our signAndSend will then use the map to resolve/reject transactions
                            const signAndSend = jest.fn().mockResolvedValue(successfulResponse)
                            const sign = jest.fn().mockRejectedValue('Oh god no')
                            const signerFactory: OmniSignerFactory = jest.fn().mockResolvedValue({ signAndSend, sign })
                            const signAndSendTransactions = createSignAndSend(signerFactory)

                            // Now we send all the transactions to the flow and observe the output
                            const [successful, errors, pending] = await signAndSendTransactions(transactions)

                            // Since we are executing groups of transactions in parallel,
                            // in general the order of successful transaction will not match the order of input transactions
                            expect(successful).toContainAllValues(
                                transactions.map((transaction) => ({ transaction, receipt }))
                            )
                            expect(errors).toEqual([])
                            expect(pending).toEqual([])

                            // What needs to match though is the order of successful transactions within groups
                            //
                            // For that we group the successful transactions and make sure those are equal to the grouped original transactions
                            const groupedSuccessful = groupTransactionsByEid(
                                successful.map(({ transaction }) => transaction)
                            )
                            expect(groupedSuccessful).toEqual(groupTransactionsByEid(transactions))

                            // We also check that the signer factory has been called with the eids
                            for (const transaction of transactions) {
                                expect(signerFactory).toHaveBeenCalledWith(transaction.point.eid)
                            }
                        })
                    )
                })

                it('should bail on the first submission error', async () => {
                    await fc.assert(
                        fc.asyncProperty(
                            fc.array(transactionArbitrary),
                            transactionArbitrary,
                            fc.array(transactionArbitrary),
                            async (firstBatch, failedTransaction, secondBatch) => {
                                // We'll prepare some mock objects for this test
                                // to mock the transaction responses and receipts
                                const error = new Error('Failed transaction')
                                const receipt = { transactionHash: '0x0' }
                                const successfulWait = jest.fn().mockResolvedValue(receipt)
                                const successfulResponse: OmniTransactionResponse = {
                                    transactionHash: '0x0',
                                    wait: successfulWait,
                                }

                                // In order to resolve the good ones and reject the bad ones
                                // we'll prepare a map between a transaction and its response
                                //
                                // This map relies on the fact that we are passing the transaction object without modifying it
                                // so the objects are referentially equal
                                const implementations: Map<OmniTransaction, Promise<unknown>> = new Map([
                                    ...firstBatch.map((t) => [t, Promise.resolve(successfulResponse)] as const),
                                    ...secondBatch.map((t) => [t, Promise.resolve(successfulResponse)] as const),
                                    [failedTransaction, Promise.reject(error)],
                                ])

                                const expectedSuccessful = [
                                    // The first batch should all go through
                                    ...firstBatch,
                                    // The transactions that are not on the chain affected by the failed transaction should also pass
                                    ...secondBatch.filter(({ point }) => point.eid !== failedTransaction.point.eid),
                                ]

                                const expectedPending = secondBatch.filter(
                                    ({ point }) => point.eid === failedTransaction.point.eid
                                )

                                // Our signAndSend will then use the map to resolve/reject transactions
                                const signAndSend = jest.fn().mockImplementation((t) => implementations.get(t))
                                const sign = jest.fn().mockRejectedValue('Oh god no')
                                const signerFactory: OmniSignerFactory = jest
                                    .fn()
                                    .mockResolvedValue({ signAndSend, sign })
                                const signAndSendTransactions = createSignAndSend(signerFactory)

                                // Now we send all the transactions to the flow and observe the output
                                const transactions = [...firstBatch, failedTransaction, ...secondBatch]
                                const [successful, errors, pending] = await signAndSendTransactions(transactions)

                                // Since we are executing groups of transactions in parallel,
                                // in general the order of successful transaction will not match the order of input transactions
                                expect(successful).toContainAllValues(
                                    expectedSuccessful.map((transaction) => ({ transaction, receipt }))
                                )
                                expect(errors).toEqual([{ transaction: failedTransaction, error }])
                                expect(pending).toEqual([failedTransaction, ...expectedPending])

                                // What needs to match though is the order of successful transactions within groups
                                //
                                // For that we group the successful transactions and make sure those are equal to the grouped original transactions
                                const groupedSuccessful = groupTransactionsByEid(
                                    successful.map(({ transaction }) => transaction)
                                )
                                expect(groupedSuccessful).toEqual(groupTransactionsByEid(expectedSuccessful))

                                // We also check that the signer factory has been called with the eids
                                expect(signerFactory).toHaveBeenCalledWith(failedTransaction.point.eid)
                                for (const transaction of firstBatch) {
                                    expect(signerFactory).toHaveBeenCalledWith(transaction.point.eid)
                                }
                            }
                        )
                    )
                })

                it('should call onProgress for every successful transaction', async () => {
                    await fc.assert(
                        fc.asyncProperty(fc.array(transactionArbitrary), async (transactions) => {
                            // We'll prepare some mock objects for this test
                            // to mock the transaction responses and receipts
                            const receipt = { transactionHash: '0x0' }

                            // Our successful wait will produce a receipt
                            const successfulWait = jest.fn().mockResolvedValue(receipt)
                            const successfulResponse: OmniTransactionResponse = {
                                transactionHash: '0x0',
                                wait: successfulWait,
                            }

                            // Our signAndSend will then use the map to resolve/reject transactions
                            const signAndSend = jest.fn().mockResolvedValue(successfulResponse)
                            const sign = jest.fn().mockRejectedValue('Oh god no')
                            const signerFactory: OmniSignerFactory = jest.fn().mockResolvedValue({ signAndSend, sign })
                            const signAndSendTransactions = createSignAndSend(signerFactory)

                            const handleProgress = jest.fn()
                            const [successful] = await signAndSendTransactions(transactions, handleProgress)

                            // We check whether onProgress has been called for every transaction
                            for (const [index, transaction] of successful.entries()) {
                                expect(handleProgress).toHaveBeenNthCalledWith(
                                    index + 1,
                                    // We expect the transaction in question to be passed
                                    transaction,
                                    // As well as the list of all the successful transactions so far
                                    successful.slice(0, index + 1)
                                )
                            }
                        })
                    )
                })
            }
        )

        describe(`when LZ_ENABLE_EXPERIMENTAL_BATCHED_WAIT environment variable is set to ''`, () => {
            beforeAll(() => {
                process.env.LZ_ENABLE_EXPERIMENTAL_BATCHED_WAIT = ''
            })

            it('should bail on the first wait error', async () => {
                await fc.assert(
                    fc.asyncProperty(
                        fc.array(transactionArbitrary),
                        transactionArbitrary,
                        fc.array(transactionArbitrary),
                        async (firstBatch, failedTransaction, secondBatch) => {
                            // We'll prepare some mock objects for this test
                            // to mock the transaction responses and receipts
                            const error = new Error('Failed transaction')
                            const receipt = { transactionHash: '0x0' }

                            // Our successful wait will produce a receipt
                            const successfulWait = jest.fn().mockResolvedValue(receipt)
                            const successfulResponse: OmniTransactionResponse = {
                                transactionHash: '0x0',
                                wait: successfulWait,
                            }

                            // Our unsuccessful wait will throw an error
                            const unsuccessfulWait = jest.fn().mockRejectedValue(error)
                            const unsuccessfulResponse: OmniTransactionResponse = {
                                transactionHash: '0x0',
                                wait: unsuccessfulWait,
                            }

                            // In order to resolve the good ones and reject the bad ones
                            // we'll prepare a map between a transaction and its response
                            //
                            // This map relies on the fact that we are passing the transaction object without modifying it
                            // so the objects are referentially equal
                            const implementations: Map<OmniTransaction, Promise<unknown>> = new Map([
                                ...firstBatch.map((t) => [t, Promise.resolve(successfulResponse)] as const),
                                ...secondBatch.map((t) => [t, Promise.resolve(successfulResponse)] as const),
                                [failedTransaction, Promise.resolve(unsuccessfulResponse)],
                            ])

                            const expectedSuccessful = [
                                // The first batch should all go through
                                ...firstBatch,
                                // The transactions that are not on the chain affected by the failed transaction should also pass
                                ...secondBatch.filter(({ point }) => point.eid !== failedTransaction.point.eid),
                            ]

                            const expectedPending = secondBatch.filter(
                                ({ point }) => point.eid === failedTransaction.point.eid
                            )

                            // Our signAndSend will then use the map to resolve/reject transactions
                            const signAndSend = jest.fn().mockImplementation((t) => implementations.get(t))
                            const sign = jest.fn().mockRejectedValue('Oh god no')
                            const signerFactory: OmniSignerFactory = jest.fn().mockResolvedValue({ signAndSend, sign })
                            const signAndSendTransactions = createSignAndSend(signerFactory)

                            // Now we send all the transactions to the flow and observe the output
                            const transactions = [...firstBatch, failedTransaction, ...secondBatch]
                            const [successful, errors, pending] = await signAndSendTransactions(transactions)

                            // Since we are executing groups of transactions in parallel,
                            // in general the order of successful transaction will not match the order of input transactions
                            expect(successful).toContainAllValues(
                                expectedSuccessful.map((transaction) => ({ transaction, receipt }))
                            )
                            expect(errors).toEqual([{ transaction: failedTransaction, error }])
                            expect(pending).toEqual([failedTransaction, ...expectedPending])

                            // What needs to match though is the order of successful transactions within groups
                            //
                            // For that we group the successful transactions and make sure those are equal to the grouped original transactions
                            const groupedSuccessful = groupTransactionsByEid(
                                successful.map(({ transaction }) => transaction)
                            )
                            expect(groupedSuccessful).toEqual(groupTransactionsByEid(expectedSuccessful))

                            // We also check that the signer factory has been called with the eids
                            expect(signerFactory).toHaveBeenCalledWith(failedTransaction.point.eid)
                            for (const transaction of firstBatch) {
                                expect(signerFactory).toHaveBeenCalledWith(transaction.point.eid)
                            }
                        }
                    )
                )
            })
        })

        describe(`when LZ_ENABLE_EXPERIMENTAL_BATCHED_WAIT environment variable is set to '1'`, () => {
            beforeAll(() => {
                process.env.LZ_ENABLE_EXPERIMENTAL_BATCHED_WAIT = '1'
            })

            it('should not bail on the first wait error', async () => {
                await fc.assert(
                    fc.asyncProperty(
                        fc.array(transactionArbitrary),
                        transactionArbitrary,
                        fc.array(transactionArbitrary),
                        async (firstBatch, failedTransaction, secondBatch) => {
                            // We'll prepare some mock objects for this test
                            // to mock the transaction responses and receipts
                            const error = new Error('Failed transaction')
                            const receipt = { transactionHash: '0x0' }

                            // Our successful wait will produce a receipt
                            const successfulWait = jest.fn().mockResolvedValue(receipt)
                            const successfulResponse: OmniTransactionResponse = {
                                transactionHash: '0x0',
                                wait: successfulWait,
                            }

                            // Our unsuccessful wait will throw an error
                            const unsuccessfulWait = jest.fn().mockRejectedValue(error)
                            const unsuccessfulResponse: OmniTransactionResponse = {
                                transactionHash: '0x0',
                                wait: unsuccessfulWait,
                            }

                            // In order to resolve the good ones and reject the bad ones
                            // we'll prepare a map between a transaction and its response
                            //
                            // This map relies on the fact that we are passing the transaction object without modifying it
                            // so the objects are referentially equal
                            const implementations: Map<OmniTransaction, Promise<unknown>> = new Map([
                                ...firstBatch.map((t) => [t, Promise.resolve(successfulResponse)] as const),
                                ...secondBatch.map((t) => [t, Promise.resolve(successfulResponse)] as const),
                                [failedTransaction, Promise.resolve(unsuccessfulResponse)],
                            ])

                            const expectedSuccessful = [
                                // The first batch should all go through
                                ...firstBatch,
                                // The second batch should all go through since they all were submitted and will all be mined
                                ...secondBatch,
                            ]

                            // Our signAndSend will then use the map to resolve/reject transactions
                            const signAndSend = jest.fn().mockImplementation((t) => implementations.get(t))
                            const sign = jest.fn().mockRejectedValue('Oh god no')
                            const signerFactory: OmniSignerFactory = jest.fn().mockResolvedValue({ signAndSend, sign })
                            const signAndSendTransactions = createSignAndSend(signerFactory)

                            // Now we send all the transactions to the flow and observe the output
                            const transactions = [...firstBatch, failedTransaction, ...secondBatch]
                            const [successful, errors, pending] = await signAndSendTransactions(transactions)

                            // Since we are executing groups of transactions in parallel,
                            // in general the order of successful transaction will not match the order of input transactions
                            expect(successful).toContainAllValues(
                                expectedSuccessful.map((transaction) => ({ transaction, receipt }))
                            )
                            expect(errors).toEqual([{ transaction: failedTransaction, error }])
                            expect(pending).toEqual([failedTransaction])

                            // What needs to match though is the order of successful transactions within groups
                            //
                            // For that we group the successful transactions and make sure those are equal to the grouped original transactions
                            const groupedSuccessful = groupTransactionsByEid(
                                successful.map(({ transaction }) => transaction)
                            )
                            expect(groupedSuccessful).toEqual(groupTransactionsByEid(expectedSuccessful))

                            // We also check that the signer factory has been called with the eids
                            expect(signerFactory).toHaveBeenCalledWith(failedTransaction.point.eid)
                            for (const transaction of firstBatch) {
                                expect(signerFactory).toHaveBeenCalledWith(transaction.point.eid)
                            }
                        }
                    )
                )
            })
        })

        describe(`when LZ_ENABLE_EXPERIMENTAL_BATCHED_SEND environment variable is set to '1'`, () => {
            beforeAll(() => {
                process.env.LZ_ENABLE_EXPERIMENTAL_BATCHED_SEND = '1'
            })

            afterAll(() => {
                process.env.LZ_ENABLE_EXPERIMENTAL_BATCHED_SEND = ''
            })

            describe('when signAndSendBatch is supported', () => {
                it('should only return errors if the submission fails', async () => {
                    await fc.assert(
                        fc.asyncProperty(fc.array(transactionArbitrary), async (transactions) => {
                            // We'll prepare some mock objects for this test
                            // to mock the transaction responses and receipts
                            const error = new Error('Failed transaction')

                            // Our signAndSend will then use the map to resolve/reject transactions
                            const signAndSendBatch = jest.fn().mockRejectedValue(error)
                            const signAndSend = jest.fn().mockRejectedValue('Oh god no')
                            const sign = jest.fn().mockRejectedValue('Oh god no')
                            const signerFactory: OmniSignerFactory = jest
                                .fn()
                                .mockResolvedValue({ signAndSend, signAndSendBatch, sign })
                            const signAndSendTransactions = createSignAndSend(signerFactory)

                            // Now we send all the transactions to the flow and observe the output
                            const [successful, errors, pending] = await signAndSendTransactions(transactions)

                            // Since we are executing groups of transactions in parallel,
                            // in general the order of successful transaction will not match the order of input transactions
                            expect(successful).toEqual([])
                            expect(errors).toContainAllValues(
                                transactions.map((transaction) => ({ transaction, error }))
                            )
                            expect(pending).toContainAllValues(transactions)

                            // We also check that the signer factory has been called with the eids
                            for (const transaction of transactions) {
                                expect(signerFactory).toHaveBeenCalledWith(transaction.point.eid)
                            }
                        })
                    )
                })

                it('should only return errors if the waiting fails', async () => {
                    await fc.assert(
                        fc.asyncProperty(fc.array(transactionArbitrary), async (transactions) => {
                            // We'll prepare some mock objects for this test
                            // to mock the transaction responses and receipts
                            const error = new Error('Failed transaction')
                            // Our unsuccessful wait will throw an error
                            const wait = jest.fn().mockRejectedValue(error)
                            const response: OmniTransactionResponse = {
                                transactionHash: '0x0',
                                wait,
                            }

                            // Our signAndSend will then use the map to resolve/reject transactions
                            const signAndSendBatch = jest.fn().mockResolvedValue(response)
                            const signAndSend = jest.fn().mockRejectedValue('Oh god no')
                            const sign = jest.fn().mockRejectedValue('Oh god no')
                            const signerFactory: OmniSignerFactory = jest
                                .fn()
                                .mockResolvedValue({ signAndSend, signAndSendBatch, sign })
                            const signAndSendTransactions = createSignAndSend(signerFactory)

                            // Now we send all the transactions to the flow and observe the output
                            const [successful, errors, pending] = await signAndSendTransactions(transactions)

                            // Since we are executing groups of transactions in parallel,
                            // in general the order of successful transaction will not match the order of input transactions
                            expect(successful).toEqual([])
                            expect(errors).toContainAllValues(
                                transactions.map((transaction) => ({ transaction, error }))
                            )
                            expect(pending).toContainAllValues(transactions)

                            // We also check that the signer factory has been called with the eids
                            for (const transaction of transactions) {
                                expect(signerFactory).toHaveBeenCalledWith(transaction.point.eid)
                            }
                        })
                    )
                })

                it('should only return successes if waiting succeeds', async () => {
                    await fc.assert(
                        fc.asyncProperty(fc.array(transactionArbitrary), async (transactions) => {
                            const receipt = { transactionHash: '0x0' }

                            // Our successful wait will produce a receipt
                            const wait = jest.fn().mockResolvedValue(receipt)
                            const response: OmniTransactionResponse = {
                                transactionHash: '0x0',
                                wait,
                            }

                            // Our signAndSend will then use the map to resolve/reject transactions
                            const signAndSendBatch = jest.fn().mockResolvedValue(response)
                            const signAndSend = jest.fn().mockRejectedValue('Oh god no')
                            const sign = jest.fn().mockRejectedValue('Oh god no')
                            const signerFactory: OmniSignerFactory = jest
                                .fn()
                                .mockResolvedValue({ signAndSend, signAndSendBatch, sign })
                            const signAndSendTransactions = createSignAndSend(signerFactory)

                            // Now we send all the transactions to the flow and observe the output
                            const [successful, errors, pending] = await signAndSendTransactions(transactions)

                            // Since we are executing groups of transactions in parallel,
                            // in general the order of successful transaction will not match the order of input transactions
                            expect(successful).toContainAllValues(
                                transactions.map((transaction) => ({ transaction, receipt }))
                            )
                            expect(errors).toEqual([])
                            expect(pending).toEqual([])

                            // We also check that the signer factory has been called with the eids
                            for (const transaction of transactions) {
                                expect(signerFactory).toHaveBeenCalledWith(transaction.point.eid)
                            }
                        })
                    )
                })
            })
        })
    })
})
