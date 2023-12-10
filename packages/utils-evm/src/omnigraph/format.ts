import { formatOmniPoint } from '@layerzerolabs/utils'
import type { OmniContract } from './types'
import { omniContractToPoint } from './coordinates'

export const formatOmniContract = (contract: OmniContract): string =>
    `EVM contract at ${formatOmniPoint(omniContractToPoint(contract))}`
