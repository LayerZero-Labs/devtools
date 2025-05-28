import 'hardhat/types/config'

interface Onft721AdapterConfig {
    tokenAddress: string
}

declare module 'hardhat/types/config' {
    interface HardhatNetworkUserConfig {
        onft721Adapter?: never
    }

    interface HardhatNetworkConfig {
        onft721Adapter?: never
    }

    interface HttpNetworkUserConfig {
        onft721Adapter?: Onft721AdapterConfig
    }

    interface HttpNetworkConfig {
        onft721Adapter?: Onft721AdapterConfig
    }
}
