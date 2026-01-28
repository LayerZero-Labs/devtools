const { RpcProvider } = require('starknet');

async function test() {
    const rpcUrl = process.env.RPC_URL_STARKNET;
    console.log('RPC URL:', rpcUrl ? rpcUrl.substring(0, 50) + '...' : 'NOT SET');

    if (!rpcUrl) {
        console.log('ERROR: RPC_URL_STARKNET not set!');
        return;
    }

    const provider = new RpcProvider({ nodeUrl: rpcUrl });
    const endpointAddress = '0x0524e065abff21d225fb7b28f26ec2f48314ace6094bc085f0a7cf1dc2660f68';

    console.log('Checking endpoint contract with explicit RPC...');
    try {
        const classHash = await provider.getClassHashAt(endpointAddress);
        console.log('Endpoint exists, class hash:', classHash);
    } catch (e) {
        console.log('Error:', e.message);
    }
}

test().catch(console.error);
