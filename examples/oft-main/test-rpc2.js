const { RpcProvider, Contract } = require('starknet');

const { abi } = require('@layerzerolabs/protocol-starknet-v2');

async function test() {
    const rpcUrl = process.env.RPC_URL_STARKNET;
    console.log('RPC URL set:', !!rpcUrl);

    const provider = new RpcProvider({ nodeUrl: rpcUrl });
    const endpointAddress = '0x0524e065abff21d225fb7b28f26ec2f48314ace6094bc085f0a7cf1dc2660f68';

    console.log('Checking endpoint contract...');
    try {
        const classHash = await provider.getClassHashAt(endpointAddress);
        console.log('Endpoint exists, class hash:', classHash);

        // Now test get_send_library
        const endpoint = new Contract({ abi: abi.endpointV2, address: endpointAddress, providerOrAccount: provider });
        const oftAddress = '0x5eb4babf020b4f4a44efb6412f2d43053f9f6ce2e0b3f0d586247802ae4dcb0';

        console.log('\nTesting get_send_library for Arbitrum (30110)...');
        const result = await endpoint.get_send_library(oftAddress, 30110);
        console.log('Result:', result);
        if (result?.lib) {
            console.log('Library:', '0x' + BigInt(result.lib).toString(16));
        }
    } catch (e) {
        console.log('Error:', e.message.substring(0, 200));
    }
}

test().catch(console.error);
