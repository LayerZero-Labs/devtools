import { HardhatUserConfig } from "hardhat/types"

/**
 * This is a dummy hardhat config that enables us to test
 * hardhat functionality without mocking too much
 */
const config: HardhatUserConfig = {
    networks: {
        "ethereum-mainnet": {
            url: "https://eth.llamarpc.com",
            saveDeployments: true,
        },
        "bsc-testnet": {
            url: "https://bsc-testnet.publicnode.com",
            accounts: {
                mnemonic: "test test test test test test test test test test test junk",
            },
        },
    },
}

export default config
