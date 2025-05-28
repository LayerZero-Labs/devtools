import { Network as AptosNetworkStage } from '@aptos-labs/ts-sdk'

import { loadAptosYamlConfig } from './config'

export async function parseYaml(): Promise<{
    account_address: string
    private_key: string
    network: AptosNetworkStage
    fullnode: string
    faucet?: string
}> {
    const aptosYamlConfig = await loadAptosYamlConfig()

    let account_address = aptosYamlConfig.profiles.default.account
    const private_key = aptosYamlConfig.profiles.default.private_key
    const network = aptosYamlConfig.profiles.default.network.toLowerCase() as AptosNetworkStage
    const fullnode = aptosYamlConfig.profiles.default.rest_url
    const faucet = aptosYamlConfig.profiles.default.faucet_url ?? undefined

    if (!account_address.startsWith('0x')) {
        account_address = '0x' + account_address
    }

    return { account_address, private_key, network, fullnode, faucet }
}
