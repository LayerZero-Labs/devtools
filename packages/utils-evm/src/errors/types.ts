import type { ContractError } from './errors'

export type OmniContractErrorParser = (error: unknown) => ContractError
