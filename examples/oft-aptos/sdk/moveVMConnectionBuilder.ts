// todo: implement connection builder that reads form yaml and fills in config with movement stuff if needed
// todo replace all mentions of aptos with move-vm instead

import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'

export function getConnection(network: Network, fullnode: string, faucet: string): Aptos {
    if (faucet.toLowerCase().includes('movement')) {
        const indexer = getIndexerUrl(network)
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

function getIndexerUrl(network: Network): string {
    if (network === Network.TESTNET) {
        return 'https://indexer.testnet.porto.movementnetwork.xyz/v1/graphql'
    } else if (network === Network.MAINNET) {
        return 'N/A'
    } else {
        throw new Error('Invalid network')
    }
}
