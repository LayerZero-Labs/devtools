import type { EndpointId } from '@layerzerolabs/lz-definitions'

export type EndpointBasedFactory<TValue> = (eid: EndpointId) => TValue | Promise<TValue>
