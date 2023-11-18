import { EndpointId } from "@layerzerolabs/lz-definitions"

declare module "hardhat/types/config" {
    interface HardhatNetworkUserConfig {
        endpointId?: never
    }

    interface HardhatNetworkConfig {
        endpointId?: never
    }

    interface HttpNetworkUserConfig {
        endpointId?: EndpointId
    }

    interface HttpNetworkConfig {
        endpointId?: EndpointId
    }
}
