import { withLayerZeroArtifacts } from "@layerzerolabs/hardhat-utils"
import { HardhatUserConfig } from "hardhat/types"

/**
 * This is a dummy hardhat config that enables us to test
 * hardhat functionality without mocking too much
 */
const config: HardhatUserConfig = {
    networks: {
        hardhat: {
            endpointId: 30_000,
        },
    },
}

export default withLayerZeroArtifacts("@layerzerolabs/lz-evm-sdk-v2")(config)
