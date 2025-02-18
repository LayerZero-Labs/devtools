import { AnvilOptions } from '@layerzerolabs/devtools-evm'

export interface SimulationUserConfig {
    /**
     * Simulation works by creating local forks of networks specified
     * in hardhat config. These networks are containerized and not accessible
     * from the developer machine - instead, a simple proxy server
     * listening on this port proxies requests to the individual networks.
     *
     * For example, a hardhat configuration with networks `fuji` and `mainnet`
     * will result in two forks being created. These networks will then be accessible
     * on `http://localhost:<port>/fuji` and `http://localhost:<port>/mainnet`
     *
     * @default 8545
     */
    port?: number

    /**
     * Simulation task stores its artifacts on the local filesystem.
     *
     * To customize the path, set this property to a relative or absolute path
     * (relative path will be resolved against the root path of your hardhat project)
     *
     * @default .layerzero
     */
    directory?: string

    /**
     * Simulation will by default overwrite the network accounts by values
     * provided in Anvil config (or defaults if not present).
     *
     * The mnemonic will default to "test test test test test test test test test test test junk"
     * and the number of funded accounts to 10.
     *
     * @default true
     */
    overwriteAccounts?: boolean

    /**
     * Anvil overrides for the underlying EVM nodes.
     */
    anvil?: SimulationAnvilUserConfig
}

/**
 * Resolved simulation config
 */
export interface SimulationConfig {
    port: number
    directory: string
    overwriteAccounts: boolean
    anvil: SimulationAnvilConfig
}

/**
 * Resolved simulation config for anvil.
 *
 * This config is created by taking the user config
 * and applying defaults.
 */
export type SimulationAnvilConfig = AnvilOptions & {
    mnemonic: NonNullable<AnvilOptions['mnemonic']>
}

/**
 * User facing simulation config for anvil.
 *
 * This config cannot override several system attributes for anvil
 * (since it would not really make sense seeing that anvil is being run in containers):
 *
 * - host & port: this would break the docker port bindings
 * - state: state is kept within the container and is not accessible from the outside
 * - forkUrl: this is set based on the hardhat config and points to the hardhat network url
 */
export type SimulationAnvilUserConfig = Omit<AnvilOptions, 'host' | 'port' | 'state' | 'forkUrl'>
