import { EndpointId } from '@layerzerolabs/lz-definitions'
import type { OmniPoint } from './types'

export const formatEid = (eid: EndpointId): string => EndpointId[eid] ?? `Unknown EndpointId (${eid})`

export const formatOmniPoint = ({ eid, address }: OmniPoint): string => `${address} @ ${formatEid(eid)}`
