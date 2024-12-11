import { Network } from '@aptos-labs/ts-sdk'

import { EndpointId, Stage } from '@layerzerolabs/lz-definitions-v3'

import { loadAptosYamlConfig } from './config'

export function getEidFromAptosNetwork(network: Network): number {
    if (network === Network.MAINNET || network.toLowerCase() === 'mainnet') {
        return EndpointId.APTOS_V2_MAINNET
    } else if (network === Network.TESTNET || network.toLowerCase() === 'testnet') {
        return EndpointId.APTOS_V2_TESTNET
    } else if (network === Network.CUSTOM || network.toLowerCase() === 'sandbox') {
        return EndpointId.APTOS_V2_SANDBOX
    } else {
        throw new Error(`Unsupported network: ${network}`)
    }
}

export function getLzNetworkStage(network: Network): Stage {
    if (network === Network.MAINNET) {
        return Stage.MAINNET
    } else if (network === Network.TESTNET) {
        return Stage.TESTNET
    } else if (network === Network.CUSTOM) {
        return Stage.SANDBOX
    } else {
        throw new Error(`Unsupported network: ${network}`)
    }
}

export async function parseYaml(): Promise<{
    account_address: string
    private_key: string
    network: Network
    fullnode: string
    faucet: string
}> {
    const aptosYamlConfig = await loadAptosYamlConfig()

    let account_address = aptosYamlConfig.profiles.default.account
    const private_key = aptosYamlConfig.profiles.default.private_key
    const network = aptosYamlConfig.profiles.default.network.toLowerCase() as Network
    const fullnode = aptosYamlConfig.profiles.default.rest_url
    const faucet = aptosYamlConfig.profiles.default.faucet_url

    if (!account_address.startsWith('0x')) {
        account_address = '0x' + account_address
    }

    return { account_address, private_key, network, fullnode, faucet }
}
