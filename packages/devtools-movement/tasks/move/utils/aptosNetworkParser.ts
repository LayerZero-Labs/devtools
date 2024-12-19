import { Network as AptosNetworkStage } from '@aptos-labs/ts-sdk'

import { EndpointId, Stage } from '@layerzerolabs/lz-definitions'

import { loadAptosYamlConfig } from './config'

export function getEidFromAptosNetwork(chain: string, networkStage: AptosNetworkStage): number {
    if (chain === 'aptos') {
        if (networkStage === AptosNetworkStage.MAINNET || networkStage.toLowerCase() === 'mainnet') {
            return EndpointId.APTOS_V2_MAINNET
        } else if (networkStage === AptosNetworkStage.TESTNET || networkStage.toLowerCase() === 'testnet') {
            return EndpointId.APTOS_V2_TESTNET
        } else {
            throw new Error(`Unsupported network stage for ${chain}: ${networkStage}`)
        }
    } else if (chain === 'movement') {
        if (networkStage === AptosNetworkStage.TESTNET || networkStage.toLowerCase() === 'testnet') {
            return EndpointId.MOVEMENT_V2_TESTNET
        } else {
            throw new Error(`Unsupported network stage for ${chain}: ${networkStage}`)
        }
    } else {
        throw new Error(`Unsupported chain: ${chain}`)
    }
}

export function getLzNetworkStage(network: AptosNetworkStage): Stage {
    if (network === AptosNetworkStage.MAINNET) {
        return Stage.MAINNET
    } else if (network === AptosNetworkStage.TESTNET) {
        return Stage.TESTNET
    } else if (network === AptosNetworkStage.CUSTOM) {
        return Stage.SANDBOX
    } else {
        throw new Error(`Unsupported network: ${network}`)
    }
}

export async function parseYaml(): Promise<{
    account_address: string
    private_key: string
    network: AptosNetworkStage
    fullnode: string
    faucet: string
}> {
    const aptosYamlConfig = await loadAptosYamlConfig()

    let account_address = aptosYamlConfig.profiles.default.account
    const private_key = aptosYamlConfig.profiles.default.private_key
    const network = aptosYamlConfig.profiles.default.network.toLowerCase() as AptosNetworkStage
    const fullnode = aptosYamlConfig.profiles.default.rest_url
    const faucet = aptosYamlConfig.profiles.default.faucet_url

    if (!account_address.startsWith('0x')) {
        account_address = '0x' + account_address
    }

    return { account_address, private_key, network, fullnode, faucet }
}
