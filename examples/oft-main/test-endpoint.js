const { RpcProvider } = require('starknet');

async function test() {
    const endpointAddress = '0x0524e065abff21d225fb7b28f26ec2f48314ace6094bc085f0a7cf1dc2660f68';
    const provider = new RpcProvider({ nodeUrl: process.env.RPC_URL_STARKNET });

    console.log('Checking endpoint contract...');
    try {
        const classHash = await provider.getClassHashAt(endpointAddress);
        console.log('Endpoint exists, class hash:', classHash);
    } catch (e) {
        console.log('Error checking endpoint:', e.message);
    }

    // Also check the ULN address from the config
    const ulnAddress = '0x0727f40349719ac76861a51a0b3d3e07be1577fff137bb81a5dc32e5a5c61d38';
    console.log('\nChecking ULN contract...');
    try {
        const classHash = await provider.getClassHashAt(ulnAddress);
        console.log('ULN exists, class hash:', classHash);
    } catch (e) {
        console.log('Error checking ULN:', e.message);
    }
}

test().catch(console.error);
