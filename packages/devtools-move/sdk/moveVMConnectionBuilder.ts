import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'
import { RESTClient } from '@initia/initia.js'

const CHAIN_MOVEMENT = 'movement'
const CHAIN_APTOS = 'aptos'
const CHAIN_INITIA = 'initia'
const TESTNET = 'testnet'
const MAINNET = 'mainnet'

export function getConnection(chain: string, stage: string): Aptos | RESTClient {
    if (chain === CHAIN_MOVEMENT) {
        const indexer = getMovementIndexerUrl()
        const faucet = process.env.MOVEMENT_FAUCET_URL
        const fullnode = getMovementFullnodeUrl()
        return new Aptos(
            new AptosConfig({
                network: Network.CUSTOM,
                fullnode: fullnode,
                faucet: faucet ?? undefined,
                indexer: indexer,
            })
        )
    } else if (chain === CHAIN_APTOS) {
        const aptosNetwork = getAptosNetworkFromStage(stage)
        return new Aptos(new AptosConfig({ network: aptosNetwork }))
    } else if (chain === CHAIN_INITIA) {
        if (!process.env.INITIA_REST_URL) {
            throw new Error('INITIA_REST_URL must be set in the environment variables.')
        }
        const initiaRestURL = process.env.INITIA_REST_URL
        console.log('initiaRestURL', initiaRestURL)
        const restClient = new RESTClient(initiaRestURL, {
            chainId: 'initiation-2',
            gasPrices: '0.015uinit',
            gasAdjustment: '1.75',
        })
        return restClient
    } else {
        throw new Error(`${chain}-${stage} is not supported.`)
    }
}

function getAptosNetworkFromStage(stage: string): Network {
    if (stage === TESTNET) {
        return Network.TESTNET
    } else if (stage === MAINNET) {
        return Network.MAINNET
    } else {
        throw new Error(`aptos-${stage} is not supported.`)
    }
}

export function getChain(fullnode: string): string {
    if (fullnode.toLowerCase().includes(CHAIN_MOVEMENT)) {
        return CHAIN_MOVEMENT
    } else {
        return CHAIN_APTOS
    }
}

function getMovementIndexerUrl(): string {
    if (!process.env.MOVEMENT_INDEXER_URL) {
        throw new Error('MOVEMENT_INDEXER_URL must be set in the environment variables.')
    }
    return process.env.MOVEMENT_INDEXER_URL
}

function getMovementFullnodeUrl(): string {
    if (!process.env.MOVEMENT_FULLNODE_URL) {
        throw new Error('MOVEMENT_FULLNODE_URL must be set in the environment variables.')
    }
    return process.env.MOVEMENT_FULLNODE_URL
}
