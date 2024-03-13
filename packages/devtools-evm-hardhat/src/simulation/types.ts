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
     * Anvil overrides for the underlying EVM nodes.
     */
    anvil?: SimulationAnvilUserConfig
}

export interface SimulationConfig {
    port: number
    directory: string
    anvil: SimulationAnvilConfig
}

export type SimulationAnvilConfig = AnvilOptions & {
    mnemonic: NonNullable<AnvilOptions['mnemonic']>
}

export type SimulationAnvilUserConfig = Omit<AnvilOptions, 'host' | 'port' | 'state' | 'forkUrl'>
