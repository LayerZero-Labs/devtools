import type {
    Message,
    CommonMessageInfoInternal,
    Transaction,
    TransactionActionPhase,
    TransactionComputePhase,
    Cell,
} from '@ton/core'

export const isInternalMesssage = (message: Message): message is Message & { info: CommonMessageInfoInternal } =>
    message.info.type === 'internal'

export const createIsCellInTransaction =
    (cell: Cell) =>
    (transaction: Transaction): transaction is Transaction & { inMessage: Message } =>
        transaction.inMessage != null && transaction.inMessage.body.equals(cell)

export const hasTransactionBounced = (transaction: Transaction): boolean => {
    const inMessages = transaction.inMessage ? [transaction.inMessage] : []
    const outMessages = transaction.outMessages.values()
    const messages = [...inMessages, ...outMessages]
    const bouncedMessages = messages.filter(isInternalMesssage).filter(({ info: { bounced } }) => !!bounced)

    return bouncedMessages.length > 0
}

export const isTransactionActionPhaseSuccessful = (action: TransactionActionPhase): boolean =>
    !!action.success && action.skippedActions === 0

export const isTransactionComputePhaseSuccessful = (action: TransactionComputePhase): boolean =>
    action.type !== 'skipped' && !!action.success

export const isTransactionSuccessful = ({ description }: Transaction): boolean => {
    switch (description.type) {
        case 'storage':
        case 'split-install':
            return true

        case 'merge-prepare':
            return !description.aborted

        default:
            // Aborted means no
            if (description.aborted) {
                return false
            }

            // Failed compute phase means no
            if (!isTransactionComputePhaseSuccessful(description.computePhase)) {
                return false
            }

            // Failed action phase means no
            if (description.actionPhase != null && !isTransactionActionPhaseSuccessful(description.actionPhase)) {
                return false
            }

            return true
    }
}
