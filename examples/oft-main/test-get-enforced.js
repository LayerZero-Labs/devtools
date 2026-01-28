const { Contract, RpcProvider } = require('starknet');

const pkg = require('@layerzerolabs/oft-mint-burn-starknet');

async function test() {
    const abi = pkg.abi.oFTMintBurnAdapter;
    const address = '0x5eb4babf020b4f4a44efb6412f2d43053f9f6ce2e0b3f0d586247802ae4dcb0';
    const provider = new RpcProvider({ nodeUrl: process.env.RPC_URL_STARKNET });

    const contract = new Contract({ abi, address, providerOrAccount: provider });

    console.log('Testing get_enforced_options...');

    // Test for Arbitrum (30110) and msg_type 1
    try {
        const result = await contract.get_enforced_options(30110, 1);
        console.log('Arbitrum enforced options:', result);
        console.log('Type:', typeof result);
        if (result && typeof result === 'object') {
            console.log('Keys:', Object.keys(result));
        }
    } catch (e) {
        console.log('Error getting Arbitrum options:', e.message);
    }

    // Test for Sui (30378) and msg_type 1
    try {
        const result = await contract.get_enforced_options(30378, 1);
        console.log('Sui enforced options:', result);
    } catch (e) {
        console.log('Error getting Sui options:', e.message);
    }
}

test().catch(console.error);
