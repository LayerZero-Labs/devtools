const { Contract, RpcProvider } = require('starknet');

const pkg = require('@layerzerolabs/oft-mint-burn-starknet');

async function test() {
    const abi = pkg.abi.oFTMintBurnAdapter;
    const address = '0x5eb4babf020b4f4a44efb6412f2d43053f9f6ce2e0b3f0d586247802ae4dcb0';
    const provider = new RpcProvider({ nodeUrl: process.env.RPC_URL_STARKNET });

    const contract = new Contract({ abi, address, providerOrAccount: provider });

    console.log('Contract keys:', Object.keys(contract).slice(0, 20));
    console.log('Has set_enforced_options:', 'set_enforced_options' in contract);
    console.log('Has functions property:', 'functions' in contract);
    if (contract.functions) {
        console.log(
            'Functions keys:',
            Object.keys(contract.functions).filter((k) => k.includes('enforce') || k.includes('option'))
        );
    }
    console.log('typeof set_enforced_options:', typeof contract.set_enforced_options);
    console.log('typeof populateTransaction:', typeof contract.populateTransaction);
    if (contract.populateTransaction) {
        console.log(
            'populateTransaction has set_enforced_options:',
            'set_enforced_options' in contract.populateTransaction
        );
    }
}

test().catch(console.error);
