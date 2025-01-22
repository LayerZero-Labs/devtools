import fs from 'fs'
import path from 'path'

import { Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk'
import YAML from 'yaml'
import { OAppOmniGraphHardhat } from '@layerzerolabs/toolbox-hardhat'

type AptosYamlConfig = {
    profiles: {
        default: {
            network: string
            private_key: string
            public_key: string
            account: string
            rest_url: string
            faucet_url?: string
        }
    }
}

export async function getLzConfig(configPath: string): Promise<OAppOmniGraphHardhat> {
    const lzConfigPath = path.resolve(path.join(process.cwd(), configPath))
    const lzConfigFile = await import(lzConfigPath)
    const lzConfig = lzConfigFile.default
    return lzConfig
}

export async function loadAptosYamlConfig(_rootDir: string = process.cwd()): Promise<AptosYamlConfig> {
    const configPath = path.resolve(path.join(_rootDir, '.aptos/config.yaml'))

    if (!fs.existsSync(configPath)) {
        throw new Error(
            `Aptos config file not found at ${configPath}.\n\n\tPlease run "aptos init" to initialize your project.\n`
        )
    }

    const file = fs.readFileSync(configPath, 'utf8')
    const config = YAML.parse(file) as AptosYamlConfig
    return config
}

export function createAccountFromPrivateKey(privateKey: string, account_address: string): Account {
    return Account.fromPrivateKey({
        privateKey: new Ed25519PrivateKey(privateKey),
        address: account_address,
    })
}

export function getNamedAddresses(networkType: string): string {
    const addressesPath = path.join(__dirname, './deploymentAddresses.json')
    const addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'))
    const networkAddresses = addresses[`${networkType}-addresses`]

    return Object.entries(networkAddresses)
        .map(([name, addr]) => `${name}=${addr}`)
        .join(',')
}
