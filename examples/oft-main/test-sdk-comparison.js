require('dotenv').config();
const { RpcProvider, Contract } = require('starknet');

const { abi } = require('@layerzerolabs/protocol-starknet-v2');

async function test() {
    const rpcUrl = process.env.RPC_URL_STARKNET;
    const provider = new RpcProvider({ nodeUrl: rpcUrl });
    const endpointAddress = '0x0524e065abff21d225fb7b28f26ec2f48314ace6094bc085f0a7cf1dc2660f68';
    const endpoint = new Contract({ abi: abi.endpointV2, address: endpointAddress, providerOrAccount: provider });
    const oftAddress = '0x5eb4babf020b4f4a44efb6412f2d43053f9f6ce2e0b3f0d586247802ae4dcb0';

    // Get current send library
    const result = await endpoint.get_send_library(oftAddress, 30110);
    const currentLib = result?.lib;

    // The config expects this library
    const configLib = '0x0727f40349719ac76861a51a0b3d3e07be1577fff137bb81a5dc32e5a5c61d38';

    console.log('Current library (raw):', currentLib);
    console.log('Current library (type):', typeof currentLib);
    console.log('Current library (hex):', '0x' + BigInt(currentLib).toString(16));
    console.log('Config library:', configLib);

    // How SDK parses it
    const parseFelt = (value) => {
        if (value == null) return undefined;
        if (typeof value === 'string') return value;
        if (typeof value === 'bigint') return '0x' + value.toString(16);
        if (typeof value === 'object' && value !== null && 'value' in value) {
            const feltValue = value.value;
            return typeof feltValue === 'bigint' ? '0x' + feltValue.toString(16) : String(feltValue);
        }
        return undefined;
    };

    const sdkParsedLib = parseFelt(currentLib);
    console.log('SDK parsed library:', sdkParsedLib);

    // Compare
    console.log('\nComparison:');
    console.log('sdkParsedLib === configLib:', sdkParsedLib === configLib);
    console.log(
        'sdkParsedLib.toLowerCase() === configLib.toLowerCase():',
        sdkParsedLib?.toLowerCase() === configLib.toLowerCase()
    );
}

test().catch(console.error);
