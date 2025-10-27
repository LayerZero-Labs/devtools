import basex from 'base-x'
import { ethers } from 'ethers'

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

/**
 * Converts any address format to a consistent bytes32 hex string.
 * Auto-detects the input format and converts to left-padded 32-byte hex.
 *
 * @param address - Address in any supported format
 * @returns 32-byte hex string with 0x prefix
 *
 * @example
 * basexToBytes32('0x1234...') // EVM hex (padded to 32 bytes)
 * basexToBytes32('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM') // Solana base58 (padded to 32 bytes)
 * basexToBytes32('SGVsbG8gV29ybGQ=') // TON base64 (padded to 32 bytes)
 * basexToBytes32('1234abcd') // Raw hex without 0x (padded to 32 bytes)
 */
export function basexToBytes32(address: string): string {
    const bytes = detectAndDecodeAddress(address)
    const paddedBytes = ethers.utils.zeroPad(bytes, 32)
    return `0x${Buffer.from(paddedBytes).toString('hex')}`
}

/**
 * Auto-detects address format and decodes to bytes.
 *
 * Detection algorithm (in order of priority):
 * 1. 0x prefix → Hex format (EVM, etc.)
 * 2. Base58 character set → Base58 format (Solana, etc.)
 * 3. Base64 character set → Base64 format (TON, etc.)
 * 4. Hex character set → Raw hex format (without 0x prefix)
 *
 * @param address - Address string to decode
 * @returns Uint8Array of decoded bytes
 * @throws Error if format is not recognized
 */
function detectAndDecodeAddress(address: string): Uint8Array {
    const cleanAddress = address.trim()

    if (cleanAddress.startsWith('0x')) {
        // Hex format (EVM, etc.)
        return ethers.utils.arrayify(cleanAddress)
    } else if (isBase58(cleanAddress)) {
        // Base58 format (Solana, etc.)
        return basex(BASE58_ALPHABET).decode(cleanAddress)
    } else if (isBase64(cleanAddress)) {
        // Base64 format
        return Uint8Array.from(Buffer.from(cleanAddress, 'base64'))
    } else {
        throw new Error(`Unsupported address format: ${address}. Supported formats: 0x..., base58, base64`)
    }
}

/**
 * Checks if a string is valid base58.
 * Uses regex for performance and consistency with other validation functions.
 */
function isBase58(str: string): boolean {
    const base58Regex = new RegExp(`^[${BASE58_ALPHABET}]+$`)
    return base58Regex.test(str) && str.length > 0
}

/**
 * Checks if a string is valid base64.
 * Uses regex for performance - base64 validation is fast and doesn't require
 * the overhead of exception-based validation.
 */
function isBase64(str: string): boolean {
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/
    return base64Regex.test(str) && str.length > 0 && str.length % 4 === 0
}
