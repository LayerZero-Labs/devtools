const fs = require('fs');
const path = require('path');
const Module = require('module');
const { Keypair } = require('@solana/web3.js');

const originalLoad = Module._load;

const ROOT_DIR = path.join(__dirname, '..', '..');
const KEYPAIR_DIR = path.join(ROOT_DIR, 'target', 'surfnet-programs');

const USE_LOCAL_PROGRAMS = process.env.SURFPOOL_USE_LOCAL_PROGRAMS === '1';
process.env.SURFPOOL_USE_LOCAL_PROGRAMS = USE_LOCAL_PROGRAMS ? '1' : '0';

if (USE_LOCAL_PROGRAMS) {
    if (!process.env.SURFPOOL_OFFLINE) {
        process.env.SURFPOOL_OFFLINE = '1';
    }
    if (!fs.existsSync(KEYPAIR_DIR)) {
        fs.mkdirSync(KEYPAIR_DIR, { recursive: true });
    }

    const programKeypairs = [
        { name: 'endpoint', envId: 'LZ_ENDPOINT_PROGRAM_ID', envKeypair: 'LZ_ENDPOINT_PROGRAM_KEYPAIR' },
        { name: 'uln', envId: 'LZ_ULN_PROGRAM_ID', envKeypair: 'LZ_ULN_PROGRAM_KEYPAIR' },
        { name: 'executor', envId: 'LZ_EXECUTOR_PROGRAM_ID', envKeypair: 'LZ_EXECUTOR_PROGRAM_KEYPAIR' },
        { name: 'pricefeed', envId: 'LZ_PRICEFEED_PROGRAM_ID', envKeypair: 'LZ_PRICEFEED_PROGRAM_KEYPAIR' },
        { name: 'dvn', envId: 'LZ_DVN_PROGRAM_ID', envKeypair: 'LZ_DVN_PROGRAM_KEYPAIR' },
    ];

    const dvnIds = [];
    programKeypairs.forEach((program) => {
        const keypairPath = path.join(KEYPAIR_DIR, `${program.name}-keypair.json`);

        if (!fs.existsSync(keypairPath)) {
            const keypair = Keypair.generate();
            fs.writeFileSync(keypairPath, JSON.stringify(Array.from(keypair.secretKey)));
            if (!process.env[program.envId]) {
                process.env[program.envId] = keypair.publicKey.toBase58();
            }
        } else if (!process.env[program.envId]) {
            const secret = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
            const keypair = Keypair.fromSecretKey(Uint8Array.from(secret));
            process.env[program.envId] = keypair.publicKey.toBase58();
        }

        process.env[program.envKeypair] = keypairPath;
        if (program.name === 'dvn') {
            dvnIds.push(process.env[program.envId]);
        }
    });

    if (!process.env.LZ_DVN_PROGRAM_IDS && dvnIds.length) {
        process.env.LZ_DVN_PROGRAM_IDS = dvnIds.join(',');
    }
}

const gotStub = {
    default: Object.assign(
        async () => {
            throw new Error('got stub: network client not available in tests');
        },
        {
            get: async () => {
                throw new Error('got stub: network client not available in tests');
            },
            post: async () => {
                throw new Error('got stub: network client not available in tests');
            },
        }
    ),
};

Module._load = function (request, parent, isMain) {
    if (request === 'got') {
        return gotStub;
    }
    return originalLoad.call(this, request, parent, isMain);
};
