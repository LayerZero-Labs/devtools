// Test normalization
const sdkLib = '0x727f40349719ac76861a51a0b3d3e07be1577fff137bb81a5dc32e5a5c61d38';
const configLib = '0x0727f40349719ac76861a51a0b3d3e07be1577fff137bb81a5dc32e5a5c61d38';

// Normalize by removing leading zeros after 0x
const normalizeAddress = (addr) => {
    if (!addr) return addr;
    const hex = addr.toLowerCase().replace(/^0x0*/, '0x');
    return hex === '0x' ? '0x0' : hex;
};

console.log('Normalized SDK:', normalizeAddress(sdkLib));
console.log('Normalized config:', normalizeAddress(configLib));
console.log('Equal:', normalizeAddress(sdkLib) === normalizeAddress(configLib));
