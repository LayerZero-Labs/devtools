#!/usr/bin/env node
'use strict';

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
