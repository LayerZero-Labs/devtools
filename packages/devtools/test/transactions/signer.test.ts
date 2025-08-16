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

                describe('chunked batching', () => {
                    it('should chunk transactions when they exceed LZ_BATCH_SIZE', async () => {
                        const originalBatchSize = process.env.LZ_BATCH_SIZE
                        process.env.LZ_BATCH_SIZE = '3'

                        try {
                            // Create 7 transactions for the same EID to ensure chunking
                            const eid = 30101
                            const transactions = Array.from({ length: 7 }, (_, i) => ({
                                point: { eid, address: `0x${i}` },
                                data: `0x${i}`,
                            }))

                            const receipt = { transactionHash: '0x0' }
                            const wait = jest.fn().mockResolvedValue(receipt)
                            const response: OmniTransactionResponse = {
                                transactionHash: '0x0',
                                wait,
                            }

                            const signAndSendBatch = jest.fn().mockResolvedValue(response)
                            const signAndSend = jest.fn().mockRejectedValue('Oh god no')
                            const sign = jest.fn().mockRejectedValue('Oh god no')
                            const signerFactory: OmniSignerFactory = jest
                                .fn()
                                .mockResolvedValue({ signAndSend, signAndSendBatch, sign })
                            const signAndSendTransactions = createSignAndSend(signerFactory)

                            const [successful, errors, pending] = await signAndSendTransactions(transactions)

                            // Should have 3 calls to signAndSendBatch: [3, 3, 1]
                            expect(signAndSendBatch).toHaveBeenCalledTimes(3)
                            expect(signAndSendBatch).toHaveBeenNthCalledWith(1, transactions.slice(0, 3))
                            expect(signAndSendBatch).toHaveBeenNthCalledWith(2, transactions.slice(3, 6))
                            expect(signAndSendBatch).toHaveBeenNthCalledWith(3, transactions.slice(6, 7))

                            expect(successful).toHaveLength(7)
                            expect(errors).toEqual([])
                            expect(pending).toEqual([])
                        } finally {
                            process.env.LZ_BATCH_SIZE = originalBatchSize
                        }
                    })

                    it('should use default batch size when LZ_BATCH_SIZE is not set', async () => {
                        const originalBatchSize = process.env.LZ_BATCH_SIZE
                        delete process.env.LZ_BATCH_SIZE

                        try {
                            // Create 25 transactions for the same EID (more than default batch size of 20)
                            const eid = 30101
                            const transactions = Array.from({ length: 25 }, (_, i) => ({
                                point: { eid, address: `0x${i}` },
                                data: `0x${i}`,
                            }))

                            const receipt = { transactionHash: '0x0' }
                            const wait = jest.fn().mockResolvedValue(receipt)
                            const response: OmniTransactionResponse = {
                                transactionHash: '0x0',
                                wait,
                            }

                            const signAndSendBatch = jest.fn().mockResolvedValue(response)
                            const signAndSend = jest.fn().mockRejectedValue('Oh god no')
                            const sign = jest.fn().mockRejectedValue('Oh god no')
                            const signerFactory: OmniSignerFactory = jest
                                .fn()
                                .mockResolvedValue({ signAndSend, signAndSendBatch, sign })
                            const signAndSendTransactions = createSignAndSend(signerFactory)

                            const [successful, errors, pending] = await signAndSendTransactions(transactions)

                            // Should have 2 calls to signAndSendBatch: [20, 5] (default batch size is 20)
                            expect(signAndSendBatch).toHaveBeenCalledTimes(2)
                            expect(signAndSendBatch).toHaveBeenNthCalledWith(1, transactions.slice(0, 20))
                            expect(signAndSendBatch).toHaveBeenNthCalledWith(2, transactions.slice(20, 25))

                            expect(successful).toHaveLength(25)
                            expect(errors).toEqual([])
                            expect(pending).toEqual([])
                        } finally {
                            process.env.LZ_BATCH_SIZE = originalBatchSize
                        }
                    })

                    it('should not chunk when transactions are within batch size limit', async () => {
                        const originalBatchSize = process.env.LZ_BATCH_SIZE
                        process.env.LZ_BATCH_SIZE = '10'

                        try {
                            // Create 5 transactions for the same EID (less than batch size)
                            const eid = 30101
                            const transactions = Array.from({ length: 5 }, (_, i) => ({
                                point: { eid, address: `0x${i}` },
                                data: `0x${i}`,
                            }))

                            const receipt = { transactionHash: '0x0' }
                            const wait = jest.fn().mockResolvedValue(receipt)
                            const response: OmniTransactionResponse = {
                                transactionHash: '0x0',
                                wait,
                            }

                            const signAndSendBatch = jest.fn().mockResolvedValue(response)
                            const signAndSend = jest.fn().mockRejectedValue('Oh god no')
                            const sign = jest.fn().mockRejectedValue('Oh god no')
                            const signerFactory: OmniSignerFactory = jest
                                .fn()
                                .mockResolvedValue({ signAndSend, signAndSendBatch, sign })
                            const signAndSendTransactions = createSignAndSend(signerFactory)

                            const [successful, errors, pending] = await signAndSendTransactions(transactions)

                            // Should have 1 call to signAndSendBatch with all 5 transactions
                            expect(signAndSendBatch).toHaveBeenCalledTimes(1)
                            expect(signAndSendBatch).toHaveBeenNthCalledWith(1, transactions)

                            expect(successful).toHaveLength(5)
                            expect(errors).toEqual([])
                            expect(pending).toEqual([])
                        } finally {
                            process.env.LZ_BATCH_SIZE = originalBatchSize
                        }
                    })

                    it('should stop processing batches when one batch fails', async () => {
                        const originalBatchSize = process.env.LZ_BATCH_SIZE
                        process.env.LZ_BATCH_SIZE = '3'

                        try {
                            // Create 9 transactions for the same EID to ensure chunking
                            const eid = 30101
                            const transactions = Array.from({ length: 9 }, (_, i) => ({
                                point: { eid, address: `0x${i}` },
                                data: `0x${i}`,
                            }))

                            const receipt = { transactionHash: '0x0' }
                            const wait = jest.fn().mockResolvedValue(receipt)
                            const successResponse: OmniTransactionResponse = {
                                transactionHash: '0x0',
                                wait,
                            }

                            const error = new Error('Batch failed')
                            const signAndSendBatch = jest
                                .fn()
                                .mockResolvedValueOnce(successResponse) // First batch succeeds
                                .mockRejectedValueOnce(error) // Second batch fails
                                .mockResolvedValue(successResponse) // Third batch would succeed but shouldn't be called

                            const signAndSend = jest.fn().mockRejectedValue('Oh god no')
                            const sign = jest.fn().mockRejectedValue('Oh god no')
                            const signerFactory: OmniSignerFactory = jest
                                .fn()
                                .mockResolvedValue({ signAndSend, signAndSendBatch, sign })
                            const signAndSendTransactions = createSignAndSend(signerFactory)

                            const [successful, errors, pending] = await signAndSendTransactions(transactions)

                            // Should have 2 calls to signAndSendBatch (first succeeds, second fails, third not called)
                            expect(signAndSendBatch).toHaveBeenCalledTimes(2)
                            expect(signAndSendBatch).toHaveBeenNthCalledWith(1, transactions.slice(0, 3))
                            expect(signAndSendBatch).toHaveBeenNthCalledWith(2, transactions.slice(3, 6))

                            // First batch should succeed
                            expect(successful).toHaveLength(3)
                            expect(successful).toContainAllValues(
                                transactions.slice(0, 3).map((transaction) => ({ transaction, receipt }))
                            )

                            // Second batch should fail
                            expect(errors).toHaveLength(3)
                            expect(errors).toContainAllValues(
                                transactions.slice(3, 6).map((transaction) => ({ transaction, error }))
                            )

                            // Third batch should be pending
                            expect(pending).toContainAllValues(transactions.slice(3, 9))
                        } finally {
                            process.env.LZ_BATCH_SIZE = originalBatchSize
                        }
                    })

                    it('should handle chunking across multiple EIDs correctly', async () => {
                        const originalBatchSize = process.env.LZ_BATCH_SIZE
                        process.env.LZ_BATCH_SIZE = '2'

                        try {
                            // Create transactions for different EIDs
                            const transactions = [
                                { point: { eid: 30101, address: '0x1' }, data: '0x1' },
                                { point: { eid: 30101, address: '0x2' }, data: '0x2' },
                                { point: { eid: 30101, address: '0x3' }, data: '0x3' },
                                { point: { eid: 30102, address: '0x4' }, data: '0x4' },
                                { point: { eid: 30102, address: '0x5' }, data: '0x5' },
                                { point: { eid: 30102, address: '0x6' }, data: '0x6' },
                            ]

                            const receipt = { transactionHash: '0x0' }
                            const wait = jest.fn().mockResolvedValue(receipt)
                            const response: OmniTransactionResponse = {
                                transactionHash: '0x0',
                                wait,
                            }

                            const signAndSendBatch = jest.fn().mockResolvedValue(response)
                            const signAndSend = jest.fn().mockRejectedValue('Oh god no')
                            const sign = jest.fn().mockRejectedValue('Oh god no')
                            const signerFactory: OmniSignerFactory = jest
                                .fn()
                                .mockResolvedValue({ signAndSend, signAndSendBatch, sign })
                            const signAndSendTransactions = createSignAndSend(signerFactory)

                            const [successful, errors, pending] = await signAndSendTransactions(transactions)

                            // Should chunk per EID:
                            // EID 30101: 3 transactions -> 2 batches [2, 1]
                            // EID 30102: 3 transactions -> 2 batches [2, 1]
                            // Total: 4 calls to signAndSendBatch
                            expect(signAndSendBatch).toHaveBeenCalledTimes(4)

                            expect(successful).toHaveLength(6)
                            expect(errors).toEqual([])
                            expect(pending).toEqual([])
                        } finally {
                            process.env.LZ_BATCH_SIZE = originalBatchSize
                        }
                    })

                    it('should handle edge case of exact multiple of batch size', async () => {
                        const originalBatchSize = process.env.LZ_BATCH_SIZE
                        process.env.LZ_BATCH_SIZE = '3'

                        try {
                            // Create exactly 6 transactions (2 * batch size)
                            const eid = 30101
                            const transactions = Array.from({ length: 6 }, (_, i) => ({
                                point: { eid, address: `0x${i}` },
                                data: `0x${i}`,
                            }))

                            const receipt = { transactionHash: '0x0' }
                            const wait = jest.fn().mockResolvedValue(receipt)
                            const response: OmniTransactionResponse = {
                                transactionHash: '0x0',
                                wait,
                            }

                            const signAndSendBatch = jest.fn().mockResolvedValue(response)
                            const signAndSend = jest.fn().mockRejectedValue('Oh god no')
                            const sign = jest.fn().mockRejectedValue('Oh god no')
                            const signerFactory: OmniSignerFactory = jest
                                .fn()
                                .mockResolvedValue({ signAndSend, signAndSendBatch, sign })
                            const signAndSendTransactions = createSignAndSend(signerFactory)

                            const [successful, errors, pending] = await signAndSendTransactions(transactions)

                            // Should have exactly 2 calls to signAndSendBatch with 3 transactions each
                            expect(signAndSendBatch).toHaveBeenCalledTimes(2)
                            expect(signAndSendBatch).toHaveBeenNthCalledWith(1, transactions.slice(0, 3))
                            expect(signAndSendBatch).toHaveBeenNthCalledWith(2, transactions.slice(3, 6))

                            expect(successful).toHaveLength(6)
                            expect(errors).toEqual([])
                            expect(pending).toEqual([])
                        } finally {
                            process.env.LZ_BATCH_SIZE = originalBatchSize
                        }
                    })
                })
            })
        })
    })
})
