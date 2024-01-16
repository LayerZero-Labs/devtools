import { HashMap } from '@/common/map'
import { serializePoint, serializeVector } from './coordinates'
import type { OmniPoint, OmniVector } from './types'

export class OmniPointMap<V, P extends OmniPoint = OmniPoint> extends HashMap<P, V> {
    [Symbol.toStringTag] = 'OmniPointMap'

    protected override serializeKey(point: P): string {
        return serializePoint(point)
    }
}

export class OmniVectorMap<V, P extends OmniVector = OmniVector> extends HashMap<P, V> {
    [Symbol.toStringTag] = 'OmniVectorMap'

    protected override serializeKey(point: P): string {
        return serializeVector(point)
    }
}
