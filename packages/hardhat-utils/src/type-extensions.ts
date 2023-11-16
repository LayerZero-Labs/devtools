import { EndpointId } from "@layerzerolabs/lz-definitions"

declare module "hardhat/types/config" {
    interface HardhatNetworkUserConfig {
        endpointId?: number
    }

    interface HardhatNetworkConfig {
        endpointId?: number
    }

    interface HttpNetworkUserConfig {
        endpointId?: EndpointId
    }

    interface HttpNetworkConfig {
        endpointId?: EndpointId
    }
}
