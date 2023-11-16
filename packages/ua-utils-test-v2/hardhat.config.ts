import "hardhat-deploy"
import { withLayerZeroArtifacts } from "@layerzerolabs/hardhat-utils"
import { EndpointId } from "@layerzerolabs/lz-definitions"
import { HardhatUserConfig } from "hardhat/types"

const MNEMONIC = "test test test test test test test test test test test test"

/**
 * This is a dummy hardhat config that enables us to test
 * hardhat functionality without mocking too much
 */
const config: HardhatUserConfig = {
    networks: {
        hardhat: {
            accounts: {
                mnemonic: MNEMONIC,
            },
        },
        vengaboys: {
            endpointId: EndpointId.ETHEREUM_MAINNET,
            url: "http://network-vengaboys:8545",
            accounts: {
                mnemonic: MNEMONIC,
            },
        },
        britney: {
            endpointId: EndpointId.AVALANCHE_MAINNET,
            url: "http://network-britney:8545",
            accounts: {
                mnemonic: MNEMONIC,
            },
        },
    },
}

export default withLayerZeroArtifacts("@layerzerolabs/lz-evm-sdk-v2")(config)
