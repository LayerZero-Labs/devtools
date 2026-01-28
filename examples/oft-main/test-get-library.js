const { Contract, RpcProvider } = require('starknet');

const { abi } = require('@layerzerolabs/protocol-starknet-v2');

async function test() {
    const endpointAddress = '0x0524e065abff21d225fb7b28f26ec2f48314ace6094bc085f0a7cf1dc2660f68';
    const oftAddress = '0x5eb4babf020b4f4a44efb6412f2d43053f9f6ce2e0b3f0d586247802ae4dcb0';
    const arbEid = 30110;
    const provider = new RpcProvider({ nodeUrl: process.env.RPC_URL_STARKNET });

    const endpoint = new Contract({ abi: abi.endpointV2, address: endpointAddress, providerOrAccount: provider });

    console.log('Testing get_send_library...');
    try {
        const result = await endpoint.get_send_library(oftAddress, arbEid);
        console.log('Raw result:', result);
        console.log('Type:', typeof result);
        if (result && typeof result === 'object') {
            console.log('Keys:', Object.keys(result));
            console.log('lib:', result.lib);
            console.log('lib as hex:', result.lib ? '0x' + BigInt(result.lib).toString(16) : 'null');
        }
    } catch (e) {
        console.log('Error:', e.message);
    }

    console.log('\nTesting get_receive_library...');
    try {
        const result = await endpoint.get_receive_library(oftAddress, arbEid);
        console.log('Raw result:', result);
        if (result && typeof result === 'object') {
            console.log('lib:', result.lib);
            console.log('lib as hex:', result.lib ? '0x' + BigInt(result.lib).toString(16) : 'null');
            console.log('is_default:', result.is_default);
        }
    } catch (e) {
        console.log('Error:', e.message);
    }
}

test().catch(console.error);
