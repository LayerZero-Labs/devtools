import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'

import { Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk'
import YAML from 'yaml'
import { OAppOmniGraphHardhat } from '@layerzerolabs/toolbox-hardhat'
import { EndpointId, getNetworkForChainId, Stage } from '@layerzerolabs/lz-definitions'

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

export function getOAppOwner(selectedContract: OAppOmniGraphHardhat['contracts'][number]): string {
    if (!selectedContract.config?.owner) {
        throw new Error(ownerNotSetMessage)
    }
    return selectedContract.config.owner
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

export function getMoveVMAccountAddress(chain: string): string {
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
    } else if (chain === 'initia') {
        if (process.env.INITIA_ACCOUNT_ADDRESS) {
            return process.env.INITIA_ACCOUNT_ADDRESS
        } else {
            throw new Error('INITIA_ACCOUNT_ADDRESS must bet set in the environment variables.')
        }
    } else {
        throw new Error(`${chain} is not supported.`)
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

export function getNamedAddresses(
    chain: string,
    networkType: string,
    moveTomlAdminName: string,
    selectedContract: OAppOmniGraphHardhat['contracts'][number]
): string {
    const oAppOwner = getOAppOwner(selectedContract)
    let named_addresses = ''
    if (chain === 'movement' || chain === 'aptos') {
        named_addresses = `${moveTomlAdminName.replace('_admin', '')}=${oAppOwner},${moveTomlAdminName}=${oAppOwner}`
    } else if (chain === 'initia') {
        named_addresses = `${moveTomlAdminName}=${oAppOwner}`
    }
    const deploymentAddresses = getDeploymentAddresses(chain, networkType)
    const allAddresses = named_addresses + ',' + deploymentAddresses

    return allAddresses
}

export function getDeploymentAddresses(chain: string, networkType: string): string {
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

export function getMoveVMPrivateKey(chain: string): string {
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
    } else if (chain === 'initia') {
        const initiaPrivateKey = process.env.INITIA_PRIVATE_KEY
        if (!initiaPrivateKey) {
            throw new Error('INITIA_PRIVATE_KEY must be set in the environment variables.')
        }
        return initiaPrivateKey
    } else {
        throw new Error(`${chain} is not supported.`)
    }
}

export async function getMoveVMOperationArgs(configPath: string): Promise<{
    lzConfig: OAppOmniGraphHardhat
    selectedContract: OAppOmniGraphHardhat['contracts'][number]
    chainName: string
    stage: Stage
    accountAddress: string
}> {
    const lzConfig = await getLzConfig(configPath)
    const moveVMContracts = getMoveVMContracts(lzConfig)
    const selectedContract = await promptUserContractSelection(moveVMContracts)
    const lzNetwork = getNetworkForChainId(selectedContract.contract.eid)
    const chainName = lzNetwork.chainName
    const stage = lzNetwork.env
    const accountAddress = getMoveVMAccountAddress(chainName)

    return { lzConfig, selectedContract, chainName, stage, accountAddress }
}

export async function checkConfigYamlNetwork(chain: string, _rootDir: string = process.cwd()): Promise<void> {
    const configPath = path.resolve(path.join(_rootDir, '.aptos/config.yaml'))

    if (!fs.existsSync(configPath)) {
        console.error(
            `❌ Aptos config file not found at ${configPath}.\n\n\tPlease run "aptos init" to initialize your project.\n`
        )
        process.exit(1)
    }

    const file = fs.readFileSync(configPath, 'utf8')
    const config = YAML.parse(file) as AptosYamlConfig
    const network = config.profiles.default.network.toLowerCase()

    let warningMessage = ''
    if (chain === 'movement') {
        if (network !== 'custom') {
            warningMessage = `\x1b[33m⚠️  Warning: You are deploying to Movement chain but your .aptos/config.yaml network is set to "${network}".
Please run "aptos init --network=custom" and enter your Movement account information.\x1b[0m`
        }
    } else if (chain === 'aptos') {
        if (network === 'custom') {
            warningMessage = `\x1b[33m⚠️  Warning: You are deploying to Aptos chain but your .aptos/config.yaml network is set to "custom".
Please run "aptos init" and choose the appropriate Aptos network (mainnet/testnet) for your deployment.\x1b[0m`
        }
    }

    if (warningMessage) {
        console.warn(warningMessage)
        const { shouldContinue } = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'shouldContinue',
                message: 'Are you sure you want to continue?',
                default: false,
            },
        ])

        if (!shouldContinue) {
            console.log('❌ Operation cancelled.')
            process.exit(1)
        }
    }
}

async function getAptosVersion(aptosCommand: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const childProcess = spawn(aptosCommand, ['--version'])
        let stdout = ''

        childProcess.stdout?.on('data', (data) => {
            stdout += data.toString()
        })

        childProcess.on('close', (code) => {
            if (code === 0) {
                const versionMatch = stdout.match(/aptos (\d+\.\d+\.\d+)/)
                versionMatch ? resolve(versionMatch[1]) : reject(new Error('Could not parse version'))
            } else {
                reject(new Error(`aptos --version exited with code ${code}`))
            }
        })

        childProcess.on('error', reject)
    })
}

export async function getAptosCLICommand(chain: string, stage: string): Promise<string> {
    const aptosCommand = 'aptos'
    const version = await getAptosVersion(aptosCommand)
    if (chain === 'aptos') {
        console.log('Aptos chain detected')
        const MIN_VERSION = '6.0.1'

        if (greaterThanOrEqualTo(version, MIN_VERSION)) {
            console.log(`🚀 Aptos CLI version ${version} is compatible.`)
        } else {
            throw Error(`❌ Aptos CLI version too old. Required: ${MIN_VERSION} or newer, Found: ${version}`)
        }
    } else if (chain === 'movement') {
        const MAX_VERSION = '3.5.0'

        if (lessThanOrEqualTo(version, MAX_VERSION)) {
            console.log(`🚀 Aptos CLI version ${version} is compatible.`)
        } else {
            throw Error(`❌ Aptos CLI version too new. Required: ${MAX_VERSION} or older, Found: ${version}`)
        }
    } else {
        throw new Error(`Chain ${chain}-${stage} not supported for build.`)
    }
    return aptosCommand
}

function greaterThanOrEqualTo(installed: string, required: string): boolean {
    const installedParts = installed.split('.').map(Number)
    const requiredParts = required.split('.').map(Number)

    for (let i = 0; i < 3; i++) {
        if (installedParts[i] < requiredParts[i]) {
            return false
        }
    }
    // all parts are greater than or equal to the required version
    return true
}

function lessThanOrEqualTo(installed: string, required: string): boolean {
    const installedParts = installed.split('.').map(Number)
    const requiredParts = required.split('.').map(Number)

    for (let i = 0; i < 3; i++) {
        if (installedParts[i] > requiredParts[i]) {
            return false
        }
    }
    // all parts are less than or equal to the required version
    return true
}
