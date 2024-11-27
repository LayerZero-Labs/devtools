import fs from 'fs'
import YAML from 'yaml'
import { Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk'

type AptosYamlConfig = {
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

export async function loadAptosYamlConfig(): Promise<AptosYamlConfig> {
    const file = fs.readFileSync('./.aptos/config.yaml', 'utf8')
    const config = YAML.parse(file) as AptosYamlConfig
    return config
}

export function createAccountFromPrivateKey(privateKey: string, account_address: string): Account {
    return Account.fromPrivateKey({
        privateKey: new Ed25519PrivateKey(privateKey),
        address: account_address,
    })
}
