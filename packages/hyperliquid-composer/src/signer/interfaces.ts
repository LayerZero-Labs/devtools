import type { TypedDataDomain, TypedDataField } from 'ethers-v6'

/**
 * Signature result with r, s, v components
 */
export interface SignatureComponents {
    r: string
    s: string
    v: number
}

/**
 * Abstract signer interface for signing EIP-712 typed data
 * Can be implemented by various signing providers (Ethers, Fordefi, etc.)
 */
export interface IHyperliquidSigner {
    /**
     * Get the address of this signer
     */
    getAddress(): Promise<string>

    /**
     * Sign EIP-712 typed data
     * @param domain - EIP-712 domain
     * @param types - EIP-712 types
     * @param value - Message to sign
     * @returns Signature string (0x-prefixed hex)
     */
    signTypedData(
        domain: TypedDataDomain,
        types: Record<string, Array<TypedDataField>>,
        value: Record<string, unknown>
    ): Promise<string>
}

/**
 * Configuration for Fordefi signer
 */
export interface FordefiConfig {
    /**
     * Fordefi API base URL (e.g., https://api.fordefi.com)
     * Optional - defaults to https://api.fordefi.com
     */
    apiUrl?: string

    /**
     * API access token for authentication
     */
    accessToken: string

    /**
     * API User private key for request signing (PEM format)
     * Required for sensitive operations like creating transactions
     */
    privateKey: string

    /**
     * Vault ID to use for signing
     */
    vaultId: string

    /**
     * EVM chain identifier (e.g., 'ethereum_mainnet', 'arbitrum_one')
     */
    chain: string

    /**
     * Optional: Timeout in milliseconds for waiting for signature (default: 300000 = 5 minutes)
     */
    signatureTimeout?: number

    /**
     * Optional: Polling interval in milliseconds for checking transaction status (default: 2000)
     */
    pollingInterval?: number
}

/**
 * Configuration for Fireblocks signer
 */
export interface FireblocksConfig {
    /**
     * Fireblocks API base URL (e.g., https://api.fireblocks.io)
     * Optional - defaults to https://api.fireblocks.io
     */
    apiUrl?: string

    /**
     * API Key for authentication
     */
    apiKey: string

    /**
     * API Secret key for JWT signing (PEM format RSA private key)
     * Should be the content of the fireblocks_secret.key file
     */
    secretKey: string

    /**
     * Vault Account ID to use for signing
     */
    vaultAccountId: string

    /**
     * Optional: Address index to use (default: 0 for first address)
     * Useful if you have multiple addresses in your vault
     */
    addressIndex?: number

    /**
     * Optional: Timeout in milliseconds for waiting for signature (default: 300000 = 5 minutes)
     */
    signatureTimeout?: number

    /**
     * Optional: Polling interval in milliseconds for checking transaction status (default: 2000)
     */
    pollingInterval?: number
}
