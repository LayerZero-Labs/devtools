import { NetworkConfig } from 'hardhat/types/config'

declare module 'hardhat/types/config' {
    interface HardhatNetworkUserConfig {
        isVaultChain?: never
    }

    interface HardhatNetworkConfig {
        isVaultChain?: never
    }

    interface HttpNetworkUserConfig {
        isVaultChain?: boolean
    }

    interface HttpNetworkConfig {
        isVaultChain?: boolean
    }
}

// Validation function to ensure exactly one hub chain
/**
 * Validates that exactly one network has isVaultChain set to true
 * @param networks - The networks configuration object
 * @returns The same networks object after validation
 * @throws Error if validation fails
 */
export function validateOVaultNetworks<T extends Record<string, unknown>>(networks: T): T {
    const networkNames = Object.keys(networks)
    const vaultChains = networkNames.filter((name) => {
        const network = networks[name] as { isVaultChain?: boolean }
        return network?.isVaultChain === true
    })

    if (vaultChains.length === 0) {
        throw new Error(
            'OVault configuration error: No hub chain \nfound. Exactly one network must have isVaultChain: true'
        )
    }

    if (vaultChains.length > 1) {
        throw new Error(
            `OVault configuration error: Multiple hub chains found: ${vaultChains.join(', ')}. \nExactly one network must have isVaultChain: true\n\n`
        )
    }

    return networks
}

export type NetworkConfigOvaultExtension = NetworkConfig & {
    isVaultChain?: boolean
}
