import fc from 'fast-check'
import {
    areCoordinatesEqual,
    isCoordinateEqual,
    serializeCoordinate,
    serializeCoordinates,
} from '@/omnigraph/coordinates'
import {
    coordinateArbitrary,
    addressArbitrary,
    endpointArbitrary,
    coordinatesArbitrary,
} from '../__utils__/arbitraries'

describe('omnigraph/coordinates', () => {
    describe('assertions', () => {
        describe('isCoordinateEqual', () => {
            it('should be true for referentially equal coordinates', () => {
                fc.assert(
                    fc.property(coordinateArbitrary, (coordinate) => {
                        expect(isCoordinateEqual(coordinate, coordinate)).toBeTruthy()
                    })
                )
            })

            it('should be true for value equal coordinates', () => {
                fc.assert(
                    fc.property(coordinateArbitrary, (coordinate) => {
                        expect(isCoordinateEqual(coordinate, { ...coordinate })).toBeTruthy()
                    })
                )
            })

            it("should be false when addresses don't match", () => {
                fc.assert(
                    fc.property(coordinateArbitrary, addressArbitrary, (coordinate, address) => {
                        fc.pre(coordinate.address !== address)

                        expect(isCoordinateEqual(coordinate, { ...coordinate, address })).toBeFalsy()
                    })
                )
            })

            it("should be false when endpoint IDs don't match", () => {
                fc.assert(
                    fc.property(coordinateArbitrary, endpointArbitrary, (coordinate, eid) => {
                        fc.pre(coordinate.eid !== eid)

                        expect(isCoordinateEqual(coordinate, { ...coordinate, eid })).toBeFalsy()
                    })
                )
            })
        })

        describe('areCoordinatesEqual', () => {
            it('should be true for referentially equal coordinates', () => {
                fc.assert(
                    fc.property(coordinatesArbitrary, (coordinates) => {
                        expect(areCoordinatesEqual(coordinates, coordinates)).toBeTruthy()
                    })
                )
            })

            it('should be true for value equal coordinates', () => {
                fc.assert(
                    fc.property(coordinatesArbitrary, (coordinates) => {
                        expect(areCoordinatesEqual(coordinates, { ...coordinates })).toBeTruthy()
                    })
                )
            })

            it("should be false when from coordinate doesn't match", () => {
                fc.assert(
                    fc.property(coordinatesArbitrary, coordinateArbitrary, (coordinates, from) => {
                        fc.pre(!isCoordinateEqual(coordinates.from, from))

                        expect(areCoordinatesEqual(coordinates, { ...coordinates, from })).toBeFalsy()
                    })
                )
            })

            it("should be false when to coordinate doesn't match", () => {
                fc.assert(
                    fc.property(coordinatesArbitrary, coordinateArbitrary, (coordinates, to) => {
                        fc.pre(!isCoordinateEqual(coordinates.from, to))

                        expect(areCoordinatesEqual(coordinates, { ...coordinates, to })).toBeFalsy()
                    })
                )
            })
        })
    })

    describe('serialization', () => {
        describe('serializeCoordinate', () => {
            it('should produce identical serialized values if the coordinates match', () => {
                fc.assert(
                    fc.property(coordinateArbitrary, (coordinate) => {
                        expect(serializeCoordinate(coordinate)).toBe(serializeCoordinate({ ...coordinate }))
                    })
                )
            })

            it("should produce different serialized values if the coordinates don't match", () => {
                fc.assert(
                    fc.property(coordinateArbitrary, coordinateArbitrary, (coordinateA, coordinateB) => {
                        fc.pre(!isCoordinateEqual(coordinateA, coordinateB))

                        expect(serializeCoordinate(coordinateA)).not.toBe(serializeCoordinate(coordinateB))
                    })
                )
            })
        })

        describe('serializeCoordinates', () => {
            it('should produce identical serialized values if the coordinates match', () => {
                fc.assert(
                    fc.property(coordinatesArbitrary, (coordinates) => {
                        expect(serializeCoordinates(coordinates)).toBe(serializeCoordinates({ ...coordinates }))
                    })
                )
            })

            it("should produce different serialized values if the coordinates don't match", () => {
                fc.assert(
                    fc.property(coordinatesArbitrary, coordinatesArbitrary, (coordinatesA, coordinatesB) => {
                        fc.pre(!areCoordinatesEqual(coordinatesA, coordinatesB))

                        expect(serializeCoordinates(coordinatesA)).not.toBe(serializeCoordinates(coordinatesB))
                    })
                )
            })
        })
    })
})
