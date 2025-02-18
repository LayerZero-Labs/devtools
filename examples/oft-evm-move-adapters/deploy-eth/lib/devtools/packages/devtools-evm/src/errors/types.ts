import { Factory } from '@layerzerolabs/devtools'
import type { ContractError } from './errors'
import { OmniContract } from '@/omnigraph/types'

export type OmniContractErrorParser = Factory<[error: unknown], ContractError>

export type OmniContractErrorParserFactory = Factory<
    [contract: OmniContract | null | undefined],
    OmniContractErrorParser
>
