// todo: implement connection builder that reads form yaml and fills in config with movement stuff if needed
// todo replace all mentions of aptos with move-vm instead

import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'

const CHAIN_MOVEMENT = 'movement'
const CHAIN_APTOS = 'aptos'

const MOVEMENT_INDEXER_URLS = {
    [Network.TESTNET]: 'https://indexer.testnet.porto.movementnetwork.xyz/v1/graphql',
    [Network.MAINNET]: 'N/A',
    [Network.DEVNET]: 'N/A',
    [Network.LOCAL]: 'N/A',
    [Network.CUSTOM]: 'N/A',
}

export function getConnection(chain: string, network: Network, fullnode: string, faucet: string): Aptos {
    if (chain === CHAIN_MOVEMENT) {
        const indexer = getMovementIndexerUrl(network)
        return new Aptos(
            new AptosConfig({
                network: Network.CUSTOM,
                fullnode: fullnode,
                faucet: faucet,
                indexer: indexer,
            })
        )
    } else {
        return new Aptos(new AptosConfig({ network: network }))
    }
}

export function getChain(fullnode: string): string {
    if (fullnode.toLowerCase().includes(CHAIN_MOVEMENT)) {
        return CHAIN_MOVEMENT
    } else {
        return CHAIN_APTOS
    }
}

function getMovementIndexerUrl(network: Network): string {
    const indexerUrl = MOVEMENT_INDEXER_URLS[network]
    if (indexerUrl !== 'N/A') {
        return indexerUrl
    }
    throw new Error('Invalid network')
}
