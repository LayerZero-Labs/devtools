import 'hardhat/types/config'
import { EndpointId } from '@layerzerolabs/lz-definitions'

declare module 'hardhat/types/config' {
    interface HardhatNetworkUserConfig {
        eid?: never
    }

    interface HardhatNetworkConfig {
        eid?: never
    }

    interface HttpNetworkUserConfig {
        eid?: EndpointId
    }

    interface HttpNetworkConfig {
        eid?: EndpointId
    }
}
