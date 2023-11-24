import { EndpointId } from '@layerzerolabs/lz-definitions'
import { EndpointIdSchema } from '../../src/omnigraph/schema'

export const ENDPOINT_IDS = Object.values(EndpointId).filter(
    (value): value is EndpointId => EndpointIdSchema.safeParse(value).success
)
