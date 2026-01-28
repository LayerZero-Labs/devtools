const fs = require('fs');
const path = require('path');

const { SuiClient } = require('@mysten/sui/client');
const { decodeSuiPrivateKey } = require('@mysten/sui/cryptography');
const { Ed25519Keypair } = require('@mysten/sui/keypairs/ed25519');
const { Transaction } = require('@mysten/sui/transactions');

const { Stage } = require('@layerzerolabs/lz-definitions');
const { OFT } = require('@layerzerolabs/lz-sui-oft-sdk-v2');
const { SDK } = require('@layerzerolabs/lz-sui-sdk-v2');

const ENV_PATH = path.join(__dirname, '..', '.env');
const envData = fs.readFileSync(ENV_PATH, 'utf8');
const readEnv = (key) => {
    const match = envData.match(new RegExp(`^${key}=\\s*'?([^\\n']+)'?`, 'm'));
    return match ? match[1].trim() : undefined;
};

const RPC_URL = readEnv('RPC_URL_SUI');
const SUI_PRIVATE_KEY = readEnv('SUI_PRIVATE_KEY');

const OFT_PACKAGE_ID = process.env.SUI_OFT_PACKAGE_ID;
const OAPP_OBJECT_ID = process.env.SUI_OAPP_OBJECT_ID;
const OFT_INIT_TICKET = process.env.SUI_OFT_INIT_TICKET;
const TREASURY_CAP = process.env.SUI_TREASURY_CAP;
const COIN_METADATA = process.env.SUI_COIN_METADATA;
const TOKEN_TYPE = process.env.SUI_TOKEN_TYPE;
const SHARED_DECIMALS = Number(process.env.SUI_SHARED_DECIMALS ?? 6);
const COMPOSER_MANAGER =
    process.env.SUI_COMPOSER_MANAGER || '0xfbece0b75d097c31b9963402a66e49074b0d3a2a64dd0ed666187ca6911a4d12';

if (!RPC_URL || !SUI_PRIVATE_KEY) {
    throw new Error('RPC_URL_SUI and SUI_PRIVATE_KEY are required in examples/oft-main/.env');
}

for (const [key, value] of Object.entries({
    SUI_OFT_PACKAGE_ID: OFT_PACKAGE_ID,
    SUI_OAPP_OBJECT_ID: OAPP_OBJECT_ID,
    SUI_OFT_INIT_TICKET: OFT_INIT_TICKET,
    SUI_TREASURY_CAP: TREASURY_CAP,
    SUI_COIN_METADATA: COIN_METADATA,
    SUI_TOKEN_TYPE: TOKEN_TYPE,
})) {
    if (!value) {
        throw new Error(`Missing ${key} environment variable`);
    }
}

async function main() {
    const { secretKey } = decodeSuiPrivateKey(SUI_PRIVATE_KEY);
    const keypair = Ed25519Keypair.fromSecretKey(secretKey);
    const sender = keypair.getPublicKey().toSuiAddress();

    const client = new SuiClient({ url: RPC_URL });
    const sdk = new SDK({ client, stage: Stage.MAINNET });

    const initTx = new Transaction();
    const initOft = new OFT(sdk, OFT_PACKAGE_ID, undefined, TOKEN_TYPE, OAPP_OBJECT_ID);

    const [adminCap, migrationCap] = initOft.initOftMoveCall(
        initTx,
        TOKEN_TYPE,
        OFT_INIT_TICKET,
        OAPP_OBJECT_ID,
        TREASURY_CAP,
        COIN_METADATA,
        SHARED_DECIMALS
    );
    initTx.transferObjects([adminCap, migrationCap], sender);

    const initResult = await client.signAndExecuteTransaction({
        transaction: initTx,
        signer: keypair,
        options: { showObjectChanges: true },
    });
    await client.waitForTransaction({ digest: initResult.digest });

    const oftObject = initResult.objectChanges?.find(
        (change) => change.type === 'created' && String(change.objectType).includes('::oft::OFT<')
    );
    if (!oftObject) {
        throw new Error('Failed to locate OFT object ID in init transaction');
    }
    const oftObjectId = oftObject.objectId;
    console.log('OFT object ID:', oftObjectId);

    const regTx = new Transaction();
    const regOft = new OFT(sdk, OFT_PACKAGE_ID, oftObjectId, TOKEN_TYPE, OAPP_OBJECT_ID);
    await regOft.registerOAppMoveCall(regTx, TOKEN_TYPE, oftObjectId, OAPP_OBJECT_ID, COMPOSER_MANAGER);

    const regResult = await client.signAndExecuteTransaction({
        transaction: regTx,
        signer: keypair,
        options: { showObjectChanges: true },
    });
    await client.waitForTransaction({ digest: regResult.digest });

    const deployInfo = {
        oftPackageId: OFT_PACKAGE_ID,
        oappObjectId: OAPP_OBJECT_ID,
        oftObjectId,
        tokenType: TOKEN_TYPE,
        initTx: initResult.digest,
        registerTx: regResult.digest,
    };
    const outPath = path.join(__dirname, 'deploy.json');
    fs.writeFileSync(outPath, JSON.stringify(deployInfo, null, 2));
    console.log(`Saved deployment info to ${outPath}`);
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
