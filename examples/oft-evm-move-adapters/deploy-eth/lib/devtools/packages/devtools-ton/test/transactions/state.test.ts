import { hasTransactionBounced } from '@/transactions/state'
import { Dictionary, Message, Transaction } from '@ton/core'

describe('transactions/state', () => {
    describe('hasTransactionBounced', () => {
        it('should return false if there are no messages', () => {
            const transaction = {
                inMessage: undefined,
                outMessages: Dictionary.empty(),
            } as Transaction

            expect(hasTransactionBounced(transaction)).toBeFalsy()
        })

        it('should return false if the inMessage is external-in', () => {
            const inMessage: Message = {
                info: {
                    type: 'external-in',
                },
            } as Message
            const transaction = {
                inMessage: inMessage,
                outMessages: Dictionary.empty(),
            } as Transaction

            expect(hasTransactionBounced(transaction)).toBeFalsy()
        })

        it('should return false if the inMessage is external-out', () => {
            const inMessage: Message = {
                info: {
                    type: 'external-out',
                },
            } as Message
            const transaction = {
                inMessage: inMessage,
                outMessages: Dictionary.empty(),
            } as Transaction

            expect(hasTransactionBounced(transaction)).toBeFalsy()
        })

        it('should return false if the inMessage is internal and has not bounced', () => {
            const inMessage: Message = {
                info: {
                    type: 'internal',
                    bounced: false,
                },
            } as Message
            const transaction = {
                inMessage: inMessage,
                outMessages: Dictionary.empty(),
            } as Transaction

            expect(hasTransactionBounced(transaction)).toBeFalsy()
        })

        it('should return true if the inMessage is internal and has bounced', () => {
            const inMessage: Message = {
                info: {
                    type: 'internal',
                    bounced: true,
                },
            } as Message
            const transaction = {
                inMessage: inMessage,
                outMessages: Dictionary.empty(),
            } as Transaction

            expect(hasTransactionBounced(transaction)).toBeTruthy()
        })

        it('should return false if outMessages are external-out', () => {
            const outMessage1: Message = {
                info: {
                    type: 'external-out',
                },
            } as Message
            const outMessage2: Message = {
                info: {
                    type: 'external-in',
                },
            } as Message
            const transaction = {
                inMessage: undefined,
                outMessages: Dictionary.empty().set(0, outMessage1).set(1, outMessage2),
            } as Transaction

            expect(hasTransactionBounced(transaction)).toBeFalsy()
        })

        it('should return false if the outMessages are internal and have not bounced', () => {
            const outMessage1: Message = {
                info: {
                    type: 'internal',
                    bounced: false,
                },
            } as Message
            const outMessage2: Message = {
                info: {
                    type: 'internal',
                    bounced: false,
                },
            } as Message
            const transaction = {
                inMessage: undefined,
                outMessages: Dictionary.empty().set(0, outMessage1).set(1, outMessage2),
            } as Transaction

            expect(hasTransactionBounced(transaction)).toBeFalsy()
        })

        it('should return true if the outMessages are internal and have bounced', () => {
            const outMessage1: Message = {
                info: {
                    type: 'internal',
                    bounced: false,
                },
            } as Message
            const outMessage2: Message = {
                info: {
                    type: 'internal',
                    bounced: true,
                },
            } as Message
            const transaction = {
                inMessage: undefined,
                outMessages: Dictionary.empty().set(0, outMessage1).set(1, outMessage2),
            } as Transaction

            expect(hasTransactionBounced(transaction)).toBeTruthy()
        })
    })
})
