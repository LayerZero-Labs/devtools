import fc from 'fast-check'
import {
    areVectorsEqual,
    arePointsEqual,
    serializePoint,
    serializeVector,
    areSameEndpoint,
    isVectorPossible,
    withEid,
} from '@/omnigraph/coordinates'
import {
    addressArbitrary,
    endpointArbitrary,
    nullableArbitrary,
    pointArbitrary,
    vectorArbitrary,
} from '@layerzerolabs/test-devtools'
import { endpointIdToStage } from '@layerzerolabs/lz-definitions'

describe('omnigraph/vector', () => {
    describe('assertions', () => {
        describe('arePointsEqual', () => {
            it('should be true for referentially equal vector', () => {
                fc.assert(
                    fc.property(pointArbitrary, (point) => {
                        expect(arePointsEqual(point, point)).toBeTruthy()
                    })
                )
            })

            it('should be true for value equal vector', () => {
                fc.assert(
                    fc.property(pointArbitrary, (point) => {
                        expect(arePointsEqual(point, { ...point })).toBeTruthy()
                    })
                )
            })

            it("should be false when addresses don't match", () => {
                fc.assert(
                    fc.property(pointArbitrary, addressArbitrary, (point, address) => {
                        fc.pre(point.address !== address)

                        expect(arePointsEqual(point, { ...point, address })).toBeFalsy()
                    })
                )
            })

            it("should be false when endpoint IDs don't match", () => {
                fc.assert(
                    fc.property(pointArbitrary, endpointArbitrary, (point, eid) => {
                        fc.pre(point.eid !== eid)

                        expect(arePointsEqual(point, { ...point, eid })).toBeFalsy()
                    })
                )
            })

            it("should be false when contract names don't match", () => {
                fc.assert(
                    fc.property(pointArbitrary, nullableArbitrary(fc.string()), (point, contractName) => {
                        fc.pre(point.contractName !== contractName)

                        expect(arePointsEqual(point, { ...point, contractName })).toBeFalsy()
                    })
                )
            })
        })

        describe('areVectorsEqual', () => {
            it('should be true for referentially equal vector', () => {
                fc.assert(
                    fc.property(vectorArbitrary, (vector) => {
                        expect(areVectorsEqual(vector, vector)).toBeTruthy()
                    })
                )
            })

            it('should be true for value equal vector', () => {
                fc.assert(
                    fc.property(vectorArbitrary, (vector) => {
                        expect(areVectorsEqual(vector, { ...vector })).toBeTruthy()
                    })
                )
            })

            it("should be false when from point doesn't match", () => {
                fc.assert(
                    fc.property(vectorArbitrary, pointArbitrary, (vector, from) => {
                        fc.pre(!arePointsEqual(vector.from, from))

                        expect(areVectorsEqual(vector, { ...vector, from })).toBeFalsy()
                    })
                )
            })

            it("should be false when to point doesn't match", () => {
                fc.assert(
                    fc.property(vectorArbitrary, pointArbitrary, (vector, to) => {
                        fc.pre(!arePointsEqual(vector.from, to))

                        expect(areVectorsEqual(vector, { ...vector, to })).toBeFalsy()
                    })
                )
            })
        })

        describe('areSameEndpoint', () => {
            it('should return true if the eids match', () => {
                fc.assert(
                    fc.property(pointArbitrary, pointArbitrary, (pointA, pointB) => {
                        expect(areSameEndpoint(pointA, { ...pointB, eid: pointA.eid })).toBeTruthy()
                    })
                )
            })

            it('should return false if the eids differ', () => {
                fc.assert(
                    fc.property(pointArbitrary, pointArbitrary, (pointA, pointB) => {
                        fc.pre(pointA.eid !== pointB.eid)

                        expect(areSameEndpoint(pointA, pointB)).toBeFalsy()
                    })
                )
            })
        })
    })

    describe('serialization', () => {
        describe('serializePoint', () => {
            it('should produce identical serialized values if the vector match', () => {
                fc.assert(
                    fc.property(pointArbitrary, (point) => {
                        expect(serializePoint(point)).toBe(serializePoint({ ...point }))
                    })
                )
            })

            it("should produce different serialized values if the vector don't match", () => {
                fc.assert(
                    fc.property(pointArbitrary, pointArbitrary, (pointA, pointB) => {
                        fc.pre(!arePointsEqual(pointA, pointB))

                        expect(serializePoint(pointA)).not.toBe(serializePoint(pointB))
                    })
                )
            })
        })

        describe('serializeVector', () => {
            it('should produce identical serialized values if the vector match', () => {
                fc.assert(
                    fc.property(vectorArbitrary, (vector) => {
                        expect(serializeVector(vector)).toBe(serializeVector({ ...vector }))
                    })
                )
            })

            it("should produce different serialized values if the vector don't match", () => {
                fc.assert(
                    fc.property(vectorArbitrary, vectorArbitrary, (lineA, lineB) => {
                        fc.pre(!areVectorsEqual(lineA, lineB))

                        expect(serializeVector(lineA)).not.toBe(serializeVector(lineB))
                    })
                )
            })
        })

        describe('isVectorPossible', () => {
            it('should return true if two points are on the same stage', () => {
                fc.assert(
                    fc.property(endpointArbitrary, endpointArbitrary, addressArbitrary, (eid1, eid2, address) => {
                        fc.pre(endpointIdToStage(eid1) === endpointIdToStage(eid2))

                        expect(
                            isVectorPossible({ from: { eid: eid1, address }, to: { eid: eid2, address } })
                        ).toBeTruthy()
                    })
                )
            })

            it('should return false if two points are not on the same stage', () => {
                fc.assert(
                    fc.property(endpointArbitrary, endpointArbitrary, addressArbitrary, (eid1, eid2, address) => {
                        fc.pre(endpointIdToStage(eid1) !== endpointIdToStage(eid2))

                        expect(
                            isVectorPossible({ from: { eid: eid1, address }, to: { eid: eid2, address } })
                        ).toBeFalsy()
                    })
                )
            })
        })
    })

    describe('withEid', () => {
        it('should append eid to a value', () => {
            fc.assert(
                fc.property(endpointArbitrary, fc.dictionary(fc.string(), fc.anything()), (eid, value) => {
                    expect(withEid(eid)(value)).toEqual({ ...value, eid })
                })
            )
        })
    })
})
