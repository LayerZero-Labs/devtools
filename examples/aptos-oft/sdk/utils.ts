export function hexToAptosBytesAddress(address: string | null | undefined): Uint8Array {
    const bytes = address ? Buffer.from(address.replace('0x', ''), 'hex') : new Uint8Array(0)
    const bytes32 = new Uint8Array(32)
    bytes32.set(bytes, 32 - bytes.length)
    return bytes32
}
