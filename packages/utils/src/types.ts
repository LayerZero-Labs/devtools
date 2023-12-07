import type { EndpointId } from '@layerzerolabs/lz-definitions'

export type Address = string

export type Bytes32 = string

export type EndpointBasedFactory<TValue> = (eid: EndpointId) => TValue | Promise<TValue>
