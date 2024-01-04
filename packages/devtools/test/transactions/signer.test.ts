import fc from 'fast-check'
import { pointArbitrary } from '@layerzerolabs/test-devtools'
import { OmniSignerFactory, OmniTransaction, OmniTransactionResponse, createSignAndSend } from '@/transactions'

describe('transactions/signer', () => {
    const transactionArbitrary: fc.Arbitrary<OmniTransaction> = fc.record({
        point: pointArbitrary,
        data: fc.hexaString(),
    })

    describe('createSignAndSend', () => {
        it('should return no successes and no errors when called with an empty array', async () => {
            const signAndSend = jest.fn().mockRejectedValue('Oh no')
            const sign = jest.fn().mockRejectedValue('Oh god no')
            const signerFactory: OmniSignerFactory = () => ({ signAndSend, sign })
            const signAndSendTransactions = createSignAndSend(signerFactory)

            expect(await signAndSendTransactions([])).toEqual([[], []])

            expect(signAndSend).not.toHaveBeenCalled()
            expect(sign).not.toHaveBeenCalled()
        })

        it('should return all successful transactions if they all go through', async () => {
            await fc.assert(
                fc.asyncProperty(fc.array(transactionArbitrary), async (transactions) => {
                    // We'll prepare some mock objects for this test
                    // to mock the transaction responses and receipts
                    const receipt = { transactionHash: '0x0' }

                    // Our successful wait will produce a receipt
                    const successfulWait = jest.fn().mockResolvedValue(receipt)
                    const successfullResponse: OmniTransactionResponse = {
                        transactionHash: '0x0',
                        wait: successfulWait,
                    }

                    // Our signAndSend will then use the map to resolve/reject transactions
                    const signAndSend = jest.fn().mockResolvedValue(successfullResponse)
                    const sign = jest.fn().mockRejectedValue('Oh god no')
                    const signerFactory: OmniSignerFactory = jest.fn().mockResolvedValue({ signAndSend, sign })
                    const signAndSendTransactions = createSignAndSend(signerFactory)

                    // Now we send all the transactions to the flow and observe the output
                    const [successful, errors] = await signAndSendTransactions(transactions)

                    expect(successful).toEqual(transactions.map((transaction) => ({ transaction, receipt })))
                    expect(errors).toEqual([])

                    // We also check that the signer factory has been called with the eids
                    for (const transaction of transactions) {
                        expect(signerFactory).toHaveBeenCalledWith(transaction.point.eid)
                    }
                })
            )
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
                        const successfullResponse: OmniTransactionResponse = {
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
                            ...firstBatch.map((t) => [t, Promise.resolve(successfullResponse)] as const),
                            ...secondBatch.map((t) => [t, Promise.resolve(successfullResponse)] as const),
                            [failedTransaction, Promise.resolve(unsuccessfulResponse)],
                        ])

                        // Our signAndSend will then use the map to resolve/reject transactions
                        const signAndSend = jest.fn().mockImplementation((t) => implementations.get(t))
                        const sign = jest.fn().mockRejectedValue('Oh god no')
                        const signerFactory: OmniSignerFactory = jest.fn().mockResolvedValue({ signAndSend, sign })
                        const signAndSendTransactions = createSignAndSend(signerFactory)

                        // Now we send all the transactions to the flow and observe the output
                        const transactions = [...firstBatch, failedTransaction, ...secondBatch]
                        const [successful, errors] = await signAndSendTransactions(transactions)

                        expect(successful).toEqual(firstBatch.map((transaction) => ({ transaction, receipt })))
                        expect(errors).toEqual([{ point: failedTransaction.point, error }])

                        // We also check that the signer factory has been called with the eids
                        expect(signerFactory).toHaveBeenCalledWith(failedTransaction.point.eid)
                        for (const transaction of firstBatch) {
                            expect(signerFactory).toHaveBeenCalledWith(transaction.point.eid)
                        }
                    }
                )
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
                        const successfullResponse: OmniTransactionResponse = {
                            transactionHash: '0x0',
                            wait: successfulWait,
                        }

                        // In order to resolve the good ones and reject the bad ones
                        // we'll prepare a map between a transaction and its response
                        //
                        // This map relies on the fact that we are passing the transaction object without modifying it
                        // so the objects are referentially equal
                        const implementations: Map<OmniTransaction, Promise<unknown>> = new Map([
                            ...firstBatch.map((t) => [t, Promise.resolve(successfullResponse)] as const),
                            ...secondBatch.map((t) => [t, Promise.resolve(successfullResponse)] as const),
                            [failedTransaction, Promise.reject(error)],
                        ])

                        // Our signAndSend will then use the map to resolve/reject transactions
                        const signAndSend = jest.fn().mockImplementation((t) => implementations.get(t))
                        const sign = jest.fn().mockRejectedValue('Oh god no')
                        const signerFactory: OmniSignerFactory = jest.fn().mockResolvedValue({ signAndSend, sign })
                        const signAndSendTransactions = createSignAndSend(signerFactory)

                        // Now we send all the transactions to the flow and observe the output
                        const transactions = [...firstBatch, failedTransaction, ...secondBatch]
                        const [successful, errors] = await signAndSendTransactions(transactions)

                        expect(successful).toEqual(firstBatch.map((transaction) => ({ transaction, receipt })))
                        expect(errors).toEqual([{ point: failedTransaction.point, error }])

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
                    const successfullResponse: OmniTransactionResponse = {
                        transactionHash: '0x0',
                        wait: successfulWait,
                    }

                    // Our signAndSend will then use the map to resolve/reject transactions
                    const signAndSend = jest.fn().mockResolvedValue(successfullResponse)
                    const sign = jest.fn().mockRejectedValue('Oh god no')
                    const signerFactory: OmniSignerFactory = jest.fn().mockResolvedValue({ signAndSend, sign })
                    const signAndSendTransactions = createSignAndSend(signerFactory)

                    const handleProgress = jest.fn()
                    await signAndSendTransactions(transactions, handleProgress)

                    // We check whether onProgress has been called for every transaction
                    for (const [index, transaction] of transactions.entries()) {
                        expect(handleProgress).toHaveBeenCalledWith(
                            // We expect the transaction in question to be passed
                            { transaction, receipt },
                            // As well as the list of all the successful transactions so far
                            transactions.slice(0, index + 1)
                        )
                    }
                })
            )
        })
    })
})
