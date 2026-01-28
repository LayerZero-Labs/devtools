import type { OmniAddress, Bytes32 } from '@layerzerolabs/devtools'

/**
 * Converts a hexadecimal address string to a 32-byte Uint8Array format used by Aptos
 *
 * @param address - The hex address string to convert, optionally starting with '0x'. Can be null/undefined.
 * @returns A 32-byte Uint8Array with the address right-aligned (padded with zeros on the left)
 *
 * If the input is null/undefined, returns an empty 32-byte array.
 * Otherwise, removes '0x' prefix if present, converts hex string to bytes,
 * and right-aligns the result in a 32-byte array.
 */
export function hexAddrToAptosBytesAddr(address: string | null | undefined): Uint8Array {
    const bytes = address ? Buffer.from(address.replace('0x', ''), 'hex') : new Uint8Array(0)
    const bytes32 = new Uint8Array(32)
    bytes32.set(bytes, 32 - bytes.length)
    return bytes32
}

/**
 * Converts a Uint8Array to a hex string with 0x prefix
 *
 * @param bytes - The bytes to convert
 * @returns Hex string with 0x prefix
 */
export function bytesToHex(bytes: Uint8Array): string {
    return '0x' + Buffer.from(bytes).toString('hex')
}

/**
 * Normalizes an address to bytes32 format (64 hex characters with 0x prefix)
 *
 * Aptos uses 32-byte addresses. This function ensures addresses from
 * other chains (like EVM with 20 bytes) are properly padded to 32 bytes.
 *
 * @param address - The address to normalize
 * @returns Normalized bytes32 address
 */
export function normalizeAddressToBytes32(address: OmniAddress | null | undefined): Bytes32 {
    if (!address) {
        return '0x' + '0'.repeat(64)
    }

    // Remove 0x prefix if present
    const hex = address.replace('0x', '')

    // Pad to 64 characters (32 bytes)
    const padded = hex.padStart(64, '0')

    return `0x${padded}`
}

/**
 * Checks if an address is an empty/zero address
 *
 * @param address - The address to check
 * @returns true if the address is null, undefined, or all zeros
 */
export function isEmptyAddress(address: OmniAddress | null | undefined): boolean {
    if (!address) {
        return true
    }

    const normalized = normalizeAddressToBytes32(address)
    return normalized === '0x' + '0'.repeat(64)
}

/**
 * Compares two addresses for equality, handling different lengths
 *
 * Both addresses are normalized to bytes32 before comparison.
 *
 * @param a - First address
 * @param b - Second address
 * @returns true if addresses are equal
 */
export function areAddressesEqual(a: OmniAddress | null | undefined, b: OmniAddress | null | undefined): boolean {
    return normalizeAddressToBytes32(a) === normalizeAddressToBytes32(b)
}
