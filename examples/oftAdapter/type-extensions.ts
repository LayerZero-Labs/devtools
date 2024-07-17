import 'hardhat/types/config'

interface OftAdapterConfig {
    tokenAddress: string
}

declare module 'hardhat/types/config' {
    interface HttpNetworkUserConfig {
        oftAdapter?: OftAdapterConfig
    }

    interface HttpNetworkConfig {
        oftAdapter?: OftAdapterConfig
    }
}
