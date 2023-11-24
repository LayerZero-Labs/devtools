import { OmniEdgeCoordinates, OmniNodeCoordinate } from './types'

/**
 * Compares two coordinates by value
 *
 * @param a `OmniNodeCoordinate`
 * @param b `OmniNodeCoordinate`
 *
 * @returns `true` if the coordinates point to the same point in omniverse
 */
export const isCoordinateEqual = (a: OmniNodeCoordinate, b: OmniNodeCoordinate): boolean =>
    a.address === b.address && a.eid === b.eid

/**
 * Compares two coordinate vectors
 *
 * @param a `OmniEdgeCoordinates`
 * @param b `OmniEdgeCoordinates`
 *
 * @returns `true` if the coordinates point from and to the same point in omniverse
 */
export const areCoordinatesEqual = (a: OmniEdgeCoordinates, b: OmniEdgeCoordinates): boolean =>
    isCoordinateEqual(a.from, b.from) && isCoordinateEqual(a.to, b.to)

/**
 * Serializes a coordinate. Useful for when coordinates need to be used in Map
 * where we cannot adjust the default behavior of using a reference equality
 *
 * @param coordinate `OmniNodeCoordinate`
 *
 * @returns `string`
 */
export const serializeCoordinate = ({ address, eid }: OmniNodeCoordinate): string => `${eid}|${address}`

/**
 * Serializes coordinate vector. Useful for when coordinates need to be used in Map
 * where we cannot adjust the default behavior of using a reference equality
 *
 * @param coordinate `OmniEdgeCoordinates`
 *
 * @returns `string`
 */
export const serializeCoordinates = ({ from, to }: OmniEdgeCoordinates): string =>
    `${serializeCoordinate(from)} → ${serializeCoordinate(to)}`
