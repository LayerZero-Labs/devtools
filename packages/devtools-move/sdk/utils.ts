/**
 * Converts a hexadecimal address string to a 32-byte Uint8Array format used by Aptos
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
