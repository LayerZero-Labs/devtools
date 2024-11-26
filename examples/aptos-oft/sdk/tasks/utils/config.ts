import fs from 'fs'
import YAML from 'yaml'
import {
    Account,
    AccountAddress,
    Aptos,
    AptosConfig,
    Ed25519Account,
    Ed25519PrivateKey,
    InputViewFunctionData,
    Network,
    NetworkToNetworkName,
} from '@aptos-labs/ts-sdk'

type AptosConfig = {
    profiles: {
        default: {
            network: string
            private_key: string
            public_key: string
            account: string
            rest_url: string
            faucet_url: string
        }
    }
}

export async function loadAptosYamlConfig(): Promise<AptosConfig> {
    const file = fs.readFileSync('./.aptos/config.yaml', 'utf8')
    const config = YAML.parse(file) as AptosConfig
    return config
}

export function createAccountFromPrivateKey(privateKey: string, account_address: string): Account {
    return Account.fromPrivateKey({
        privateKey: new Ed25519PrivateKey(privateKey),
        address: account_address,
    })
}
