import type { OmniEdge, OmniNode } from '@layerzerolabs/devtools'
import { isOmniPoint } from '@layerzerolabs/devtools'
import { omniContractToPoint } from '@layerzerolabs/devtools-evm'
import { createContractFactory } from './coordinates'
import type {
    OmniContractFactoryHardhat,
    OmniEdgeHardhat,
    OmniGraphHardhatTransformer,
    OmniNodeHardhat,
    OmniPointHardhatTransformer,
} from './types'
import { parallel } from '@layerzerolabs/devtools'

/**
 * Create a function capable of transforming `OmniPointHardhat` to a regular `OmniPoint`
 * with some help from an `OmniContractFactoryHardhat`
 *
 * @param {OmniContractFactoryHardhat} contractFactory
 * @returns {OmniPointHardhatTransformer}
 */
export const createOmniPointHardhatTransformer =
    (contractFactory: OmniContractFactoryHardhat = createContractFactory()): OmniPointHardhatTransformer =>
    async (point) =>
        isOmniPoint(point) ? point : { ...point, ...omniContractToPoint(await contractFactory(point)) }

/**
 * Create a function capable of transforming `OmniNodeHardhat` to a regular `OmniNode`
 * with some help from an `OmniPointHardhatTransformer`
 *
 * @param {OmniPointHardhatTransformer} [pointTransformer]
 * @returns
 */
export const createOmniNodeHardhatTransformer =
    (pointTransformer = createOmniPointHardhatTransformer()) =>
    async <TNodeConfig>({ contract, config }: OmniNodeHardhat<TNodeConfig>): Promise<OmniNode<TNodeConfig>> => ({
        point: await pointTransformer(contract),
        config: config as TNodeConfig,
    })

/**
 * Create a function capable of transforming `OmniEdgeHardhat` to a regular `OmniEdge`
 * with some help from an `OmniPointHardhatTransformer`
 *
 * @param {OmniPointHardhatTransformer} [pointTransformer]
 * @returns
 */
export const createOmniEdgeHardhatTransformer =
    (pointTransformer = createOmniPointHardhatTransformer()) =>
    async <TEdgeConfig>({ from, to, config }: OmniEdgeHardhat<TEdgeConfig>): Promise<OmniEdge<TEdgeConfig>> => ({
        vector: {
            from: await pointTransformer(from),
            to: await pointTransformer(to),
        },
        config: config as TEdgeConfig,
    })

export const createOmniGraphHardhatTransformer =
    <TNodeConfig, TEdgeConfig>(
        nodeTransformer = createOmniNodeHardhatTransformer(),
        edgeTransformer = createOmniEdgeHardhatTransformer(),
        applicative = parallel
    ): OmniGraphHardhatTransformer<TNodeConfig, TEdgeConfig> =>
    async ({ contracts, connections }) => ({
        contracts: await applicative(contracts.map((contract) => () => nodeTransformer(contract))),
        connections: await applicative(connections.map((connection) => () => edgeTransformer(connection))),
    })
