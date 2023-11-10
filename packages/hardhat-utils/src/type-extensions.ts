import { EndpointId } from "@layerzerolabs/lz-definitions"

declare module "hardhat/types/config" {
    interface HttpNetworkUserConfig {
        endpointId?: EndpointId
    }

    interface HttpNetworkConfig {
        endpointId?: EndpointId
    }
}
