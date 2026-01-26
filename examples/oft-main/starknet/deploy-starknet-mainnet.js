#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const { Account, CallData, Contract, RpcProvider, shortString } = require('starknet');

const ENV_PATH = path.join(__dirname, '..', '.env');
const envData = fs.readFileSync(ENV_PATH, 'utf8');
const readEnv = (key) => {
    const match = envData.match(new RegExp(`^${key}=\\s*'?([^\\n']+)'?`, 'm'));
    return match ? match[1].trim() : undefined;
};

const RPC_URL = readEnv('RPC_URL_STARKNET');
const ACCOUNT_ADDRESS = readEnv('STARKNET_ACCOUNT_ADDRESS');
const PRIVATE_KEY = readEnv('STARKNET_PRIVATE_KEY');

if (!RPC_URL || !ACCOUNT_ADDRESS || !PRIVATE_KEY) {
    throw new Error('RPC_URL_STARKNET, STARKNET_ACCOUNT_ADDRESS, and STARKNET_PRIVATE_KEY are required in .env');
}

console.log('Starknet RPC:', RPC_URL);
console.log('Starknet account:', ACCOUNT_ADDRESS);

const ERC20_CLASS_HASH = '0x01bea3900ebe975f332083d441cac55f807cf5de7b1aa0b7ccbda1de53268500';
const OFT_CLASS_HASH = '0x07c02E3797d2c7B848FA94820FfB335617820d2c44D82d6B8Cf71c71fbE7dd6E';
const ENDPOINT_ADDRESS = '0x524e065abff21d225fb7b28f26ec2f48314ace6094bc085f0a7cf1dc2660f68';
const STRK_TOKEN_ADDRESS = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';
const SHARED_DECIMALS = 6;

const ERC20_NAME = 'MyToken';
const ERC20_SYMBOL = 'MTK';
const ERC20_DECIMALS = 18;

const pkgEntry = require.resolve('@layerzerolabs/oft-mint-burn-starknet');
const pkgRoot = path.resolve(path.dirname(pkgEntry), '..');
const erc20AbiModule = require(path.join(pkgRoot, 'dist/generated/abi/e-r-c20-mint-burn-upgradeable.cjs'));
const ERC20_ABI = erc20AbiModule.eRC20MintBurnUpgradeable ?? erc20AbiModule.default ?? erc20AbiModule;

const DEPLOY_PATH = path.join(__dirname, 'deploy.json');

const loadExistingDeploy = () => {
    if (!fs.existsSync(DEPLOY_PATH)) return undefined;
    try {
        return JSON.parse(fs.readFileSync(DEPLOY_PATH, 'utf8'));
    } catch {
        return undefined;
    }
};

async function main() {
    const provider = new RpcProvider({ nodeUrl: RPC_URL });
    const account = new Account({ provider, address: ACCOUNT_ADDRESS, signer: PRIVATE_KEY });
    if (!Array.isArray(ERC20_ABI)) {
        throw new Error('ERC20 ABI not found or invalid in oft-mint-burn-starknet package');
    }
    console.log('ERC20 ABI entries:', ERC20_ABI.length);
    const txDetails = {
        tip: 0n,
        resourceBounds: {
            l1_gas: { max_amount: 80_000n, max_price_per_unit: 60_000_000_000_000n },
            l2_gas: { max_amount: 1_000_000n, max_price_per_unit: 10_000_000_000n },
            l1_data_gas: { max_amount: 80_000n, max_price_per_unit: 60_000_000_000_000n },
        },
    };

    const existing = loadExistingDeploy();
    let erc20Address = process.env.STARKNET_ERC20_ADDRESS || existing?.erc20Address;
    let oftAddress = process.env.STARKNET_OFT_ADDRESS || existing?.oftAddress;
    let erc20DeployTx = existing?.erc20DeployTx;
    let oftDeployTx = existing?.oftDeployTx;

    if (!erc20Address) {
        console.log('Deploying ERC20MintBurnUpgradeable...');
        const erc20ConstructorCalldata = new CallData(ERC20_ABI).compile('constructor', {
            name: ERC20_NAME,
            symbol: ERC20_SYMBOL,
            decimals: ERC20_DECIMALS,
            default_admin: ACCOUNT_ADDRESS,
        });
        const erc20Deploy = await account.deploy(
            {
                classHash: ERC20_CLASS_HASH,
                constructorCalldata: erc20ConstructorCalldata,
            },
            txDetails
        );
        await provider.waitForTransaction(erc20Deploy.transaction_hash);
        erc20Address = Array.isArray(erc20Deploy.contract_address)
            ? erc20Deploy.contract_address[0]
            : erc20Deploy.contract_address;
        if (!erc20Address) {
            throw new Error(`ERC20 deploy did not return contract address. Tx: ${erc20Deploy.transaction_hash}`);
        }
        erc20DeployTx = erc20Deploy.transaction_hash;
        console.log('ERC20 deployed:', erc20Address);
    } else {
        console.log('Using existing ERC20:', erc20Address);
    }

    if (!oftAddress) {
        console.log('Deploying OFTMintBurnAdapter...');
        const oftDeploy = await account.deploy(
            {
                classHash: OFT_CLASS_HASH,
                constructorCalldata: [
                    erc20Address,
                    erc20Address,
                    ENDPOINT_ADDRESS,
                    ACCOUNT_ADDRESS,
                    STRK_TOKEN_ADDRESS,
                    SHARED_DECIMALS,
                ],
            },
            txDetails
        );
        await provider.waitForTransaction(oftDeploy.transaction_hash);
        oftAddress = Array.isArray(oftDeploy.contract_address)
            ? oftDeploy.contract_address[0]
            : oftDeploy.contract_address;
        if (!oftAddress) {
            throw new Error(`OFT deploy did not return contract address. Tx: ${oftDeploy.transaction_hash}`);
        }
        oftDeployTx = oftDeploy.transaction_hash;
        console.log('OFT deployed:', oftAddress);
    } else {
        console.log('Using existing OFT:', oftAddress);
    }

    const erc20 = new Contract({ abi: ERC20_ABI, address: erc20Address, providerOrAccount: account });

    const minterRole = shortString.encodeShortString('MINTER_ROLE');
    const burnerRole = shortString.encodeShortString('BURNER_ROLE');

    console.log('Granting MINTER_ROLE...');
    const grantMinter = erc20.populateTransaction.grant_role(minterRole, oftAddress);
    const grantMinterTx = await account.execute([grantMinter], txDetails);
    await provider.waitForTransaction(grantMinterTx.transaction_hash);

    console.log('Granting BURNER_ROLE...');
    const grantBurner = erc20.populateTransaction.grant_role(burnerRole, oftAddress);
    const grantBurnerTx = await account.execute([grantBurner], txDetails);
    await provider.waitForTransaction(grantBurnerTx.transaction_hash);

    const out = {
        erc20Address,
        oftAddress,
        erc20DeployTx,
        oftDeployTx,
        grantMinterTx: grantMinterTx.transaction_hash,
        grantBurnerTx: grantBurnerTx.transaction_hash,
    };
    fs.writeFileSync(DEPLOY_PATH, JSON.stringify(out, null, 2));
    console.log(`Saved deployment info to ${DEPLOY_PATH}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
