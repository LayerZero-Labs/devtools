import fs from 'fs'
import path from 'path'

import { Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk'
import YAML from 'yaml'
import { OAppOmniGraphHardhat } from '@layerzerolabs/toolbox-hardhat'
import { EndpointId, getNetworkForChainId } from '@layerzerolabs/lz-definitions'

import inquirer from 'inquirer'

const OAPP_ADMIN = 'oapp_admin'
const OFT_ADMIN = 'oft_admin'
const OAPP_TYPE = 'oapp'
const OFT_TYPE = 'oft'

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

export const ownerNotSetMessage = `Owner is not set.
In move.layerzero.config.ts, you must set the owner field in the contract config.

Example:
const config: OAppOmniGraphHardhat = {
    contracts: [
        {
            contract: <your-contract>,
            config: {
                owner: '<your-owner-address>',
                delegate: '<your-delegate-address>',
            },
        },
    ],
}`

export function getMoveTomlAdminName(oAppType: string): string {
    const cleanedOAppType = oAppType.toLowerCase()
    if (cleanedOAppType === OAPP_TYPE) {
        return OAPP_ADMIN
    } else if (cleanedOAppType === OFT_TYPE) {
        return OFT_ADMIN
    } else {
        throw new Error(`Invalid OApp type: ${oAppType}`)
    }
}

export function getAptosAccountAddress(chain: string): string {
    if (chain === 'aptos') {
        if (process.env.APTOS_ACCOUNT_ADDRESS) {
            return process.env.APTOS_ACCOUNT_ADDRESS
        } else {
            throw new Error('APTOS_ACCOUNT_ADDRESS must bet set in the environment variables.')
        }
    } else if (chain === 'movement') {
        if (process.env.MOVEMENT_ACCOUNT_ADDRESS) {
            return process.env.MOVEMENT_ACCOUNT_ADDRESS
        } else {
            throw new Error('MOVEMENT_ACCOUNT_ADDRESS must bet set in the environment variables.')
        }
    } else {
        throw new Error(`${chain} is not supported.`)
    }
}

export function getInitiaAccountAddress(): string {
    if (process.env.INITIA_ACCOUNT_ADDRESS) {
        return process.env.INITIA_ACCOUNT_ADDRESS
    } else {
        throw new Error('INITIA_ACCOUNT_ADDRESS must bet set in the environment variables.')
    }
}

export async function getLzConfig(configPath: string): Promise<OAppOmniGraphHardhat> {
    const lzConfigPath = path.resolve(path.join(process.cwd(), configPath))
    const lzConfigFile = await import(lzConfigPath)
    const lzConfig = lzConfigFile.default
    return lzConfig
}

export async function promptUserContractSelection(
    contracts: OAppOmniGraphHardhat['contracts'][number][]
): Promise<OAppOmniGraphHardhat['contracts'][number]> {
    if (contracts.length === 1) {
        return contracts[0]
    }

    const choices = contracts.map((contractEntry) => ({
        name: `${contractEntry.contract.contractName} (${EndpointId[contractEntry.contract.eid]})`,
        value: contractEntry,
    }))

    const { selectedContract } = await inquirer.prompt([
        {
            type: 'list',
            name: 'selectedContract',
            message: 'Select contract:',
            choices,
        },
    ])

    return selectedContract
}

export function getMoveVMContracts(lzConfig: OAppOmniGraphHardhat): OAppOmniGraphHardhat['contracts'][number][] {
    const contracts = []
    for (const entry of lzConfig.contracts) {
        const chainName = getNetworkForChainId(entry.contract.eid).chainName
        if (chainName === 'aptos' || chainName === 'initia' || chainName === 'movement') {
            contracts.push(entry)
        }
    }
    return contracts
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

export function getNamedAddresses(chain: string, networkType: string): string {
    const addressesPath = path.join(__dirname, './deploymentAddresses.json')
    const addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'))
    const networkAddresses = addresses[`${chain}-${networkType}-addresses`]

    if (!networkAddresses) {
        throw new Error(`${chain}-${networkType} is not supported.`)
    }

    return Object.entries(networkAddresses)
        .map(([name, addr]) => `${name}=${addr}`)
        .join(',')
}

export function getAptosPrivateKey(chain: string): string {
    if (chain === 'aptos') {
        const aptosPrivateKey = process.env.APTOS_PRIVATE_KEY
        if (!aptosPrivateKey) {
            throw new Error('APTOS_PRIVATE_KEY must be set in the environment variables.')
        }
        return aptosPrivateKey
    } else if (chain === 'movement') {
        const movementPrivateKey = process.env.MOVEMENT_PRIVATE_KEY
        if (!movementPrivateKey) {
            throw new Error('MOVEMENT_PRIVATE_KEY must be set in the environment variables.')
        }
        return movementPrivateKey
    } else {
        throw new Error(`${chain} is not supported.`)
    }
}
