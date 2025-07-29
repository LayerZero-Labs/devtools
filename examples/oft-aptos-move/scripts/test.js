#!/usr/bin/env node

import { EndpointId } from '@layerzerolabs/lz-definitions';

import { configCheckerOperation } from '../../../packages/devtools-extensible-cli/dist/index.js';

const CONTRACTS = {
    'Somnia-Mainnet': '0xC3D4E9Ac47D7f37bB07C2f8355Bb4940DEA3bbC3',
    'Ethereum-Mainnet': '0x1B0F6590d21dc02B92ad3A7D00F8884dC4f1aed9',
    'BNB-Mainnet': '0x363aaE994B139096c7C82492a4AEfFB3Cfc7dD49',
    'Base-Mainnet': '0x47636b3188774a3E7273D85A537b9bA4Ee7b2535',
};

const RPC_URLS = {
    'Somnia-Mainnet': 'https://api.infra.mainnet.somnia.network/',
    'Ethereum-Mainnet': 'https://eth-mainnet.public.blastapi.io',
    'BNB-Mainnet': 'https://bsc-mainnet.public.blastapi.io',
    'Base-Mainnet': 'https://mainnet.base.org',
};

const main = async () => {
    try {
        const args = {
            pathways: JSON.stringify([
                { address: CONTRACTS['BNB-Mainnet'], eid: EndpointId.BSC_V2_MAINNET },
                { address: CONTRACTS['Base-Mainnet'], eid: EndpointId.BASE_V2_MAINNET },
                { address: CONTRACTS['Ethereum-Mainnet'], eid: EndpointId.ETHEREUM_V2_MAINNET },
                { address: CONTRACTS['Somnia-Mainnet'], eid: EndpointId.SOMNIA_V2_MAINNET },
            ]),
            'rpc-urls': JSON.stringify({
                [EndpointId.BSC_V2_MAINNET]: RPC_URLS['BNB-Mainnet'],
                [EndpointId.BASE_V2_MAINNET]: RPC_URLS['Base-Mainnet'],
                [EndpointId.ETHEREUM_V2_MAINNET]: RPC_URLS['Ethereum-Mainnet'],
                [EndpointId.SOMNIA_V2_MAINNET]: RPC_URLS['Somnia-Mainnet'],
            }),
        };

        await configCheckerOperation.impl(args);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

main();
