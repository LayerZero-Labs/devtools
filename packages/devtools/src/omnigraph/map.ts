import { AbstractMap } from '@/common/map'
import { serializePoint, serializeVector } from './coordinates'
import type { OmniPoint, OmniVector } from './types'

export class OmniPointMap<V, K extends OmniPoint = OmniPoint> extends AbstractMap<K, V> {
    [Symbol.toStringTag] = 'OmniPointMap'

    protected override hash(point: K) {
        return serializePoint(point)
    }
}

export class OmniVectorMap<V, K extends OmniVector = OmniVector> extends AbstractMap<K, V> {
    [Symbol.toStringTag] = 'OmniVectorMap'

    protected override hash(vector: K) {
        return serializeVector(vector)
    }
}
