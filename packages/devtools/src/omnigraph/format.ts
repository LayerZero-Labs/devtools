import { EndpointId } from '@layerzerolabs/lz-definitions'
import type { OmniPoint, OmniVector } from './types'

export const formatEid = (eid: EndpointId): string => EndpointId[eid] ?? `Unknown EndpointId (${eid})`

export const formatOmniPoint = ({ eid, address, contractName }: OmniPoint): string =>
    `[${address}${contractName ? ` (${contractName})` : ``} @ ${formatEid(eid)}]`

export const formatOmniVector = ({ from, to }: OmniVector): string =>
    `${formatOmniPoint(from)} → ${formatOmniPoint(to)}`
