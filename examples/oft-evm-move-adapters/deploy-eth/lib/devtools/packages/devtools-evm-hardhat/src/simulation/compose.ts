import { pipe } from 'fp-ts/lib/function'
import * as RR from 'fp-ts/ReadonlyRecord'
import type { ComposeSpec, ComposeSpecService } from '@layerzerolabs/devtools'
import { type AnvilOptions, createAnvilCliOptions } from '@layerzerolabs/devtools-evm'
import type { ComposeSpecServices } from '@layerzerolabs/devtools'
import type { SimulationConfig } from './types'

/**
 * Creates a docker compose service specification for an anvil-based EVM node
 *
 * @param {AnvilOptions} anvilOptions
 * @returns {ComposeSpecService}
 */
export const createEvmNodeServiceSpec = (anvilOptions: AnvilOptions): ComposeSpecService => ({
    // This service references a Dockerfile that is copied
    // next to the resulting docker-compose.yaml
    //
    // The source for this Dockerfile is located in src/simulation/assets/Dockerfile.conf
    build: {
        dockerfile: 'Dockerfile',
        target: 'node-evm',
    },
    command: ['anvil', ...createAnvilCliOptions(anvilOptions)],
})

/**
 * Creates a docker compose service specification for an nginx-based proxy service
 * that proxies requests to underlying EVM nodes (or their RPC URLs to be mor precise)
 *
 * @param {number} port
 * @param {ComposeSpecServices} networkServices
 * @returns {ComposeSpecService}
 */
export const createEvmNodeProxyServiceSpec = (
    port: number,
    networkServices: ComposeSpecServices
): ComposeSpecService => ({
    // This service references a Dockerfile that is copied
    // next to the resulting docker-compose.yaml
    //
    // The source for this Dockerfile is located in src/simulation/assets/Dockerfile.conf
    build: {
        dockerfile: 'Dockerfile',
        target: 'proxy-evm',
    },
    // This service will expose its internal 8545 port to a host port
    //
    // The internal 8545 port is hardcoded both here and in the nginx.conf file,
    // the source for which is located in src/simulation/assets/nginx.conf
    ports: [`${port}:8545`],
    depends_on: pipe(
        networkServices,
        // This service will depend on the RPCs to be healthy
        // so we'll take the networkServices object and replace
        // the values with service_healthy condition
        RR.map(() => ({
            condition: 'service_healthy',
        }))
    ),
})

/**
 * Creates a docker compose spec with a set of anvil-based EVM nodes
 * and a single proxy server that proxies requests to these nodes.
 *
 * @param {SimulationConfig} config
 * @param {Record<string, AnvilOptions>} networks
 * @returns {ComposeSpec}
 */
export const createSimulationComposeSpec = (
    config: SimulationConfig,
    networks: Record<string, AnvilOptions>
): ComposeSpec => ({
    services: pipe(
        networks,
        // First we turn the networks into docker compose specs for EVM nodes
        RR.map(createEvmNodeServiceSpec),
        (networkServiceSpecs) =>
            // Then we add the RPC proxy server
            //
            // There is a small edge case here that we can address
            // if it ever comes up: if a network is called 'rpc', this compose file
            // will not work.
            //
            // The fix for this is to prefix all networks with something like network-xxx
            // but we can do that if ever this usecase comes up
            pipe(
                networkServiceSpecs,
                RR.upsertAt('rpc', createEvmNodeProxyServiceSpec(config.port, networkServiceSpecs))
            )
    ),
})
