import type { HardhatConfig, HttpNetworkConfig, NetworkConfig } from 'hardhat/types'
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
    overwriteAccounts: userConfig.overwriteAccounts ?? true,
    anvil: {
        // For now we'll hardcode the mnemonic we'll use to seed the accounts on the simulation networks
        mnemonic: 'test test test test test test test test test test test junk',
        ...userConfig.anvil,
        // The host and port need to always point to 0.0.0.0:8545
        // since anvil runs in the container that exposes this port on 0.0.0.0
        host: '0.0.0.0',
        port: 8545,
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
 * @returns {Record<string, NetworkConfig>}
 */
export const getHardhatNetworkOverrides = (
    config: SimulationConfig,
    networksConfig: Record<string, NetworkConfig>
): Record<string, NetworkConfig> =>
    pipe(
        networksConfig,
        // We want to drop all the networks that don't have URLs
        R.filter(isHttpNetworkConfig),
        // We'll take the existing network configs and point them to our RPC proxy
        //
        // It's important that these configs are not saved to filesystem as they might contain
        // sensitive data (and forgetting to ignore these files in git could lead to security breaches)
        R.mapWithIndex(
            (networkName, networkConfig): NetworkConfig => ({
                ...networkConfig,
                // We want to redirect this network to the local proxy
                //
                // This is the nginx server listening on the port we configured in the simulation configuration
                url: new URL(networkName, `http://localhost:${config.port}`).toString(),
                accounts: config.overwriteAccounts
                    ? // When overwriting accounts, all the accounts will be switched to the anvil config
                      // (or reasonable defaults if not provided)
                      {
                          mnemonic: config.anvil.mnemonic,
                          // These need to be defaulted to the anvil options
                          // (or the anvil defaults)
                          //
                          // See https://book.getfoundry.sh/reference/cli/anvil for anvil defaults
                          count: config.anvil.count ?? 10,
                          path: config.anvil.derivationPath ?? "m/44'/60'/0'/0/",
                          // These will be hardcoded for now as anvil does not support setting these
                          initialIndex: 0,
                          passphrase: '',
                      }
                    : networkConfig.accounts,
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
