#!/usr/bin/env node
'use strict';

// This script is used specifically in the `test:anchor` npm script to resolve
// the OFT program ID and output it to stdout. The test/anchor/constants.ts file
// has its own implementation since it needs the value at TypeScript import time.

const fs = require('fs');

const { Keypair } = require('@solana/web3.js');

const keypairPath = 'target/deploy/oft-keypair.json';
const fallbackId = '9UovNrJD8pQyBLheeHNayuG1wJSEAoxkmM14vw5gcsTT';

function resolveOftId() {
    try {
        if (!fs.existsSync(keypairPath)) {
            return fallbackId;
        }

        const secret = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
        return Keypair.fromSecretKey(Uint8Array.from(secret)).publicKey.toBase58();
    } catch (error) {
        return fallbackId;
    }
}

process.stdout.write(resolveOftId());
