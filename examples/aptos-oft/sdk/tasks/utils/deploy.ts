import { Account, Aptos, AptosConfig, InputViewFunctionData, Network } from '@aptos-labs/ts-sdk'

import { loadAptosYamlConfig, createAccountFromPrivateKey } from '@/utils/config'

async function main() {
    const aptosYamlConfig = await loadAptosYamlConfig()

    const account_address = aptosYamlConfig.profiles.default.account
    const public_key = aptosYamlConfig.profiles.default.public_key
    const private_key = aptosYamlConfig.profiles.default.private_key

    const account: Account = createAccountFromPrivateKey(private_key, account_address)

    const network_type = aptosYamlConfig.profiles.default.network as Network
    const full_node_url = aptosYamlConfig.profiles.default.rest_url
    const faucet_url = aptosYamlConfig.profiles.default.faucet_url

    const aptosConfig = new AptosConfig({ network: network_type, fullnode: full_node_url, faucet: faucet_url })

    const aptos = new Aptos(aptosConfig)

    const payload: InputViewFunctionData = {
        function: `::router::optimal_liquidity_amounts`,
        functionArguments: [],
    }

    const result = await aptos.view({ payload })
    console.log('Result:', result)
}

main().catch((error) => {
    console.error('Error:', error)
    process.exit(1)
})
