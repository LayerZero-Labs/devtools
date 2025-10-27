import basex from 'base-x'
import { ethers } from 'ethers'

type AddressFormat = 'hex' | 'base58'

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'

/**
 * Converts any address format to a consistent bytes32 hex string.
 * Auto-detects the input format and converts to left-padded 32-byte hex.
 *
 * @param address - Address in any supported format
 * @returns 32-byte hex string with 0x prefix
 *
 * @example
 * basexToBytes32('0x1234...') // Hex (EVM, etc...) (padded to 32 bytes)
 * basexToBytes32('9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM') // Solana base58 (padded to 32 bytes)
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
 * 2. Hex character set (with or without 0x) → Raw hex format
 * 3. Base58 character set + typical length → Base58 format (Solana, etc.)
 * 4. Base64 character set + padding → Base64 format (TON, etc.)
 *
 * Note: When formats the most specific format is used.
 *
 * @param address - Address string to decode
 * @returns Uint8Array of decoded bytes
 * @throws Error if address is empty or unsupported format
 */
function detectAndDecodeAddress(address: string): Uint8Array {
    const cleanAddress = address.trim()
    if (cleanAddress.length === 0) {
        throw new Error('Empty address provided')
    }
    const isFormatMap: Record<AddressFormat, boolean> = {
        hex: isHex(cleanAddress),
        base58: isBase58(cleanAddress),
    }
    const validFormats: AddressFormat[] = Object.keys(isFormatMap).filter(
        (key) => isFormatMap[key as AddressFormat]
    ) as AddressFormat[]
    if (validFormats.length === 0) {
        throw new Error(`Unsupported address format: ${address}`)
    } else if (validFormats.length > 1) {
        console.warn(
            `Address ${address} is valid for multiple formats: ${validFormats.join(', ')}, ` +
                `it will be interpreted as the most specific format: ${validFormats[0]}`
        )
    }
    const format = validFormats[0]
    return decodeWithFormat(cleanAddress, format)
}

/**
 * Decodes address with explicit format specification.
 */
function decodeWithFormat(address: string, format: AddressFormat): Uint8Array {
    try {
        switch (format) {
            case 'hex': {
                const hexAddress = address.startsWith('0x') ? address : `0x${address}`
                return ethers.utils.arrayify(hexAddress)
            }
            case 'base58': {
                return basex(BASE58_ALPHABET).decode(address)
            }
            default:
                throw new Error(`Unknown format: ${format}`)
        }
    } catch (error) {
        throw new Error(
            `Failed to decode address as ${format}: ${error instanceof Error ? error.message : String(error)}`
        )
    }
}

/**
 * Checks if a string is valid hexadecimal.
 */
function isHex(str: string): boolean {
    if (str.startsWith('0x')) {
        str = str.slice(2)
    }
    const hexRegex = /^[0-9a-fA-F]+$/
    return hexRegex.test(str) && str.length > 0 && str.length % 2 === 0
}

/**
 * Checks if a string is valid base58.
 * Uses regex for performance and consistency with other validation functions.
 */
function isBase58(str: string): boolean {
    const base58Regex = new RegExp(`^[${BASE58_ALPHABET}]+$`)
    return base58Regex.test(str) && str.length > 0
}
