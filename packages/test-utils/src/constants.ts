import { EndpointId } from '@layerzerolabs/lz-definitions'

export const ENDPOINT_IDS = Object.values(EndpointId).filter((value): value is EndpointId => typeof value === 'number')
