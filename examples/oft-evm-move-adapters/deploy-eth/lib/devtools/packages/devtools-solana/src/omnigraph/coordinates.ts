import { OmniPoint } from '@layerzerolabs/devtools'
import { ChainType, endpointIdToChainType } from '@layerzerolabs/lz-definitions'

export const isOmniPointOnSolana = ({ eid }: OmniPoint): boolean => endpointIdToChainType(eid) === ChainType.SOLANA
