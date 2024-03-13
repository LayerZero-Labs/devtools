import type { HardhatConfig, HttpNetworkConfig, NetworkConfig, NetworkUserConfig } from 'hardhat/types'
import type { SimulationConfig, SimulationUserConfig } from './types'
import { resolve } from 'path'
import { AnvilOptions } from '@layerzerolabs/devtools-evm'
import { pipe } from 'fp-ts/lib/function'
import * as R from 'fp-ts/Record'

/**
 * Turns `SimulationUserConfig` into `SimulationConfig` by supplying defaults
 *
 * @param {SimulationUserConfig} userConfig
 * @param {HardhatConfig} hardhatConfig
 * @returns {SimulationConfig}
 */
export const resolveSimulationConfig = (
    userConfig: SimulationUserConfig,
    hardhatConfig: HardhatConfig
): SimulationConfig => ({
    port: userConfig.port ?? 8545,
    directory: resolve(hardhatConfig.paths.root, userConfig.directory ?? '.layerzero'),
    anvil: {
        // For now we'll hardcode the mnemonic we'll use to seed the accounts on the simulation networks
        mnemonic: 'test test test test test test test test test test test junk',
        ...userConfig.anvil,
    },
})

/**
 * Takes a portion of the hardhat networks config and turns the values into `AnvilOptions`
 * to be used by a simulation network container.
 *
 * This is used in the simulation generation phase where the compose files
 * for networks defined in hardhat config are being generated.
 *
 * The `Record<string, NetworkConfig>` is used instead of `NetworksConfig` type from hardhat
 * to avoid any type issues with special keys like `localhost` or `hardhat`.
 *
 * @param {SimulationConfig} config
 * @param {Record<string, NetworkConfig>} networksConfig
 * @returns {Record<string, AnvilOptions>} Object with the same keys as the networks config, with values mapped to `AnvilOptions`
 */
export const getAnvilOptionsFromHardhatNetworks = (
    config: SimulationConfig,
    networksConfig: Record<string, NetworkConfig>
): Record<string, AnvilOptions> =>
    pipe(
        networksConfig,
        // We want to drop all the networks that don't have URLs
        R.filter(isHttpNetworkConfig),
        // And map the network configs into AnvilOptions
        R.map(
            (networkConfig: HttpNetworkConfig): AnvilOptions => ({
                ...config.anvil,
                forkUrl: networkConfig.url,
            })
        )
    )

/**
 * Returns with overrides for hardhat network configuration.
 *
 * This, when merged with a hardhat config, will redirect the network calls to the local EVM nodes.
 *
 * @param {SimulationConfig} config
 * @param {Record<string, NetworkConfig>} networksConfig
 * @returns {Record<string, NetworkUserConfig>}
 */
export const getHardhatNetworkOverrides = (
    config: SimulationConfig,
    networksConfig: Record<string, NetworkConfig>
): Record<string, NetworkUserConfig> =>
    pipe(
        networksConfig,
        // We want to drop all the networks that don't have URLs
        R.filter(isHttpNetworkConfig),
        // We'll map the network configs into objects that define the minimum overrides
        // needed to make the simulation work.
        //
        // Having the complete network configs copied here would definitely
        // simplify the step in which we'll be applying these overrides
        // to hardhat config, but it comes with a bit of bad / unexpected UX.
        //
        // If users changed their hardhat configs without regenerating the simulation configs, they would
        // not see their changes applied (since they would be hardcoded in these overrides).
        //
        // Another thing to consider is that these overrides will be turned into a JSON file.
        // Any properties that cannot be serialized would disappear (and we cannot assume only serializable properties
        // since people can use whatever hardhat plugins they want)
        R.mapWithIndex(
            (networkName): NetworkUserConfig => ({
                // We want to redirect this network to the local proxy
                //
                // This is the nginx server listening on the port we configured in the simulation configuration
                url: new URL(networkName, `http://localhost:${config.port}`).toString(),
                // For now the mnemonic in identical for all the networks and comes
                // from the simulation configuration
                //
                // In future we could respect the mnemonics set in the original hardhat config
                // but that comes with complexities:
                //
                // - Some networks / hardhat configs will not be using mnemonics
                // - We don't want to be throwing production mnemonics around and storing them in json files
                accounts: {
                    mnemonic: config.anvil.mnemonic,
                },
            })
        )
    )

/**
 * Helper utility to pick network configs by their names / object keys.
 *
 * Similar to TypeScript `Pick` helper type, but in runtime.
 *
 * @param {string[]} networks List of networks to pick
 */
export const pickNetworkConfigs = (networks: string[]) =>
    R.filterWithIndex<string, NetworkConfig>((networkName: string) => networks.includes(networkName))

/**
 * Little helper utility that checks whether a network config is not a hardhat network config
 *
 * @param {NetworkConfig} networkConfig
 * @returns {boolean}
 */
const isHttpNetworkConfig = (networkConfig: NetworkConfig): networkConfig is HttpNetworkConfig =>
    'url' in networkConfig && typeof networkConfig.url === 'string'
