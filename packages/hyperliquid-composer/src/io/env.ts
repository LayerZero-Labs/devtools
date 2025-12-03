import path from 'path'

import dotenv from 'dotenv'
import type { FordefiConfig } from '../signer/interfaces'

export function loadEnv() {
    const envPath = path.resolve(path.join(process.cwd(), '.env'))
    const env = dotenv.config({ path: envPath })
    if (!env.parsed || env.error?.message !== undefined) {
        console.error('Failed to load .env file.')
        process.exit(1)
    }

    return env.parsed
}

/**
 * Load Fordefi configuration from environment variables
 * Required env vars: FORDEFI_ACCESS_TOKEN, FORDEFI_PRIVATE_KEY, FORDEFI_VAULT_ID, FORDEFI_CHAIN
 * Optional: FORDEFI_API_URL (defaults to https://api.fordefi.com), FORDEFI_SIGNATURE_TIMEOUT, FORDEFI_POLLING_INTERVAL
 */
export function loadFordefiConfig(): FordefiConfig | null {
    const accessToken = process.env.FORDEFI_ACCESS_TOKEN
    const privateKey = process.env.FORDEFI_PRIVATE_KEY
    const vaultId = process.env.FORDEFI_VAULT_ID
    const chain = process.env.FORDEFI_CHAIN

    if (!accessToken || !privateKey || !vaultId || !chain) {
        return null
    }

    return {
        apiUrl: process.env.FORDEFI_API_URL, // Optional - will use default if not provided
        accessToken,
        privateKey,
        vaultId,
        chain,
        signatureTimeout: process.env.FORDEFI_SIGNATURE_TIMEOUT
            ? parseInt(process.env.FORDEFI_SIGNATURE_TIMEOUT, 10)
            : undefined,
        pollingInterval: process.env.FORDEFI_POLLING_INTERVAL
            ? parseInt(process.env.FORDEFI_POLLING_INTERVAL, 10)
            : undefined,
    }
}
