import { EndpointId, endpointIdToStage } from '@layerzerolabs/lz-definitions'
import { OmniVector, OmniPoint, OmniNode, WithEid } from './types'

/**
 * Compares two points by value
 *
 * @param a `OmniPoint`
 * @param b `OmniPoint`
 *
 * @returns `true` if the vector point to the same point in omniverse
 */
export const arePointsEqual = (a: OmniPoint, b: OmniPoint): boolean =>
    a.address === b.address && a.eid === b.eid && a.contractName === b.contractName

/**
 * Checks if two points are on the same endpoint
 *
 * @param a `OmniPoint`
 * @param b `OmniPoint`
 *
 * @returns `true` if the vector point to the same point in omniverse
 */
export const areSameEndpoint = (a: OmniPoint, b: OmniPoint): boolean => a.eid === b.eid

/**
 * Compares two vectors by value
 *
 * @param a `OmniVector`
 * @param b `OmniVector`
 *
 * @returns `true` if the vector point from and to the same point in omniverse
 */
export const areVectorsEqual = (a: OmniVector, b: OmniVector): boolean =>
    arePointsEqual(a.from, b.from) && arePointsEqual(a.to, b.to)

/**
 * Checks that a vector is _possible_ - i.e. connects two endpoints
 * that can be connected in reality.
 *
 * @param vector `OmniVector`
 *
 * @returns `true` if two points of the vector can be connected in reality
 */
export const isVectorPossible = ({ from, to }: OmniVector): boolean =>
    endpointIdToStage(from.eid) === endpointIdToStage(to.eid)

/**
 * Serializes a point. Useful for when points need to be used in Map
 * where we cannot adjust the default behavior of using a reference equality
 *
 * @param point `OmniPoint`
 *
 * @returns `string`
 */
export const serializePoint = ({ address, eid }: OmniPoint): string => `${eid}|${address}`

/**
 * Serializes a vector. Useful for when vectors need to be used in Map
 * where we cannot adjust the default behavior of using a reference equality
 *
 * @param point `OmniVector`
 *
 * @returns `string`
 */
export const serializeVector = ({ from, to }: OmniVector): string => `${serializePoint(from)} → ${serializePoint(to)}`

/**
 * Helper function to quickly convert a pair of nodes to a vector
 *
 * @param a `OmniNode`
 * @param b `OmniNode`
 * @returns `OmniVector`
 */
export const vectorFromNodes = (a: OmniNode, b: OmniNode): OmniVector => ({ from: a.point, to: b.point })

/**
 * Helper function to add an `eid` to arbitrary values, converting them to `WithEid`
 *
 * This is useful to reduce repetition when e.g. creating multiple `OmniPoint` instances on the same network:
 *
 * ```
 * const onMainnet = withEid(EndpointId.ETHEREUM_V2_MAINNET)
 *
 * const onePoint = onMainnet({ address: '0x0' })
 * const anotherPoint = onMainnet({ address: '0x1' })
 * ```
 */
export const withEid =
    (eid: EndpointId) =>
    <T>(value: T): WithEid<T> => ({ ...value, eid })
