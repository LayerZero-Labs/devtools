const { byteArray } = require('starknet');

// For hex data - convert to binary string first
function hexToByteArray(hex) {
    if (!hex || hex === '0x' || hex === '') {
        return byteArray.byteArrayFromString('');
    }
    const clean = hex.replace(/^0x/, '');
    const buffer = Buffer.from(clean, 'hex');
    return byteArray.byteArrayFromString(buffer.toString('latin1'));
}

console.log('Hex test:', JSON.stringify(hexToByteArray('0x1234')));
console.log('Empty hex:', JSON.stringify(hexToByteArray('')));
console.log('Undefined:', JSON.stringify(hexToByteArray(undefined)));
