import { OmniTransaction } from './types'

const isNonNullable = <T>(value: T | null | undefined): value is T => value != null

export const flattenTransactions = (
    transations: (OmniTransaction | OmniTransaction[] | null | undefined)[]
): OmniTransaction[] => transations.filter(isNonNullable).flat()
