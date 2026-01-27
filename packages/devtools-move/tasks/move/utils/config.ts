import fs from 'fs'
import path from 'path'
import { spawn } from 'child_process'
import { createHash } from 'crypto'

import { Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk'
import YAML from 'yaml'
import { importDefault } from '@layerzerolabs/io-devtools'
import { OAppOmniGraphHardhat } from '@layerzerolabs/toolbox-hardhat'
import { EndpointId, getNetworkForChainId, Stage } from '@layerzerolabs/lz-definitions'

import { deploymentAddresses } from './deploymentAddresses'

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

export function getOAppDelegate(selectedContract: OAppOmniGraphHardhat['contracts'][number]): string {
    if (!selectedContract.config?.delegate) {
        if (!selectedContract.config?.owner) {
            throw new Error(ownerNotSetMessage)
        }
        return selectedContract.config.owner
    }
    return selectedContract.config.delegate
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
    const lzConfigFile = await importDefault(lzConfigPath)
    const lzConfig = lzConfigFile as OAppOmniGraphHardhat
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

export async function getNamedAddresses(
    chain: string,
    networkType: string,
    moveTomlAdminName: string,
    selectedContract: OAppOmniGraphHardhat['contracts'][number]
): Promise<string> {
    const oAppOwner = getOAppOwner(selectedContract)
    let named_addresses = ''
    if (chain === 'movement' || chain === 'aptos') {
        named_addresses = `${moveTomlAdminName.replace('_admin', '')}=${oAppOwner},${moveTomlAdminName}=${oAppOwner}`
    } else if (chain === 'initia') {
        const oAppDeployer = await getInitiaDeployerAddress(oAppOwner)
        named_addresses = `${moveTomlAdminName.replace('_admin', '')}=${oAppDeployer},${moveTomlAdminName}=${oAppOwner}`
    }
    const deploymentAddresses = await getDeploymentAddresses(chain, networkType)
    const allAddresses = named_addresses + ',' + deploymentAddresses

    return allAddresses
}

export async function getDeploymentAddresses(chain: string, networkType: string): Promise<string> {
    const addresses = deploymentAddresses as Record<string, Record<string, string>>
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
                versionMatch ? resolve(versionMatch[1]) : reject(new Error(`Could not parse version`))
            } else {
                reject(new Error(`aptos --version exited with code ${code}`))
            }
        })

        childProcess.on('error', reject)
    })
}

async function promptVersionWarningConfirmation(): Promise<void> {
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

export async function getAptosCLICommand(chain: string, stage: string): Promise<string> {
    const aptosCommand = 'aptos'
    const version = await getAptosVersion(aptosCommand)
    if (chain === 'aptos') {
        console.log('Aptos chain detected')
        const MIN_VERSION = '6.0.1'

        if (isVersionGreaterOrEqualTo(version, MIN_VERSION)) {
            console.log(`🚀 Aptos CLI version ${version} is compatible.`)
            if (version !== MIN_VERSION) {
                console.log(
                    `\x1b[33m⚠️  Warning: You are deploying to Aptos chain but your Aptos CLI version is set to "${version}".\n\n\tOur recommended and tested version is ${MIN_VERSION}. Using other versions is at your own risk and may result in unexpected behavior.\x1b[0m`
                )
                await promptVersionWarningConfirmation()
            }
        } else {
            throw new Error(`❌ Aptos CLI version too old. Required: ${MIN_VERSION} or newer, Found: ${version}`)
        }
    } else if (chain === 'movement') {
        const MAX_VERSION = '3.5.0'

        if (isVersionLessThanOrEqualTo(version, MAX_VERSION)) {
            console.log(`🚀 Aptos CLI version ${version} is compatible.`)
            if (version !== '3.5.0') {
                console.log(
                    `\x1b[33m⚠️  Warning: You are deploying to Movement chain but your Aptos CLI version is set to "${version}".\n\n\tOur recommended and tested version is 3.5.0. Using other versions is at your own risk and may result in unexpected behavior.\x1b[0m`
                )
                await promptVersionWarningConfirmation()
            }
        } else {
            throw new Error(`❌ Aptos CLI version too new. Required: ${MAX_VERSION} or older, Found: ${version}`)
        }
    } else {
        throw new Error(`Chain ${chain}-${stage} not supported for build.`)
    }
    return aptosCommand
}

export function isVersionGreaterOrEqualTo(installed: string, required: string): boolean {
    const installedParts = installed.split('.').map(Number)
    const requiredParts = required.split('.').map(Number)

    for (let i = 0; i < 3; i++) {
        if (installedParts[i] > requiredParts[i]) {
            return true
        } else if (installedParts[i] < requiredParts[i]) {
            return false
        }
    }

    // all parts are equal to the required version
    return true
}

export function isVersionLessThanOrEqualTo(installed: string, required: string): boolean {
    const installedParts = installed.split('.').map(Number)
    const requiredParts = required.split('.').map(Number)

    for (let i = 0; i < 3; i++) {
        if (installedParts[i] > requiredParts[i]) {
            return false
        } else if (installedParts[i] < requiredParts[i]) {
            return true
        }
    }

    // all parts are equal to the required version
    return true
}

///////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////// Initia Specific Helpers //////////////////////////////////
///////////////////////////////////////////////////////////////////////////////////////////////

export function getInitiaRPCUrl() {
    if (!process.env.INITIA_RPC_URL) {
        throw new Error('INITIA_RPC_URL is not set.\n\nPlease set the INITIA_RPC_URL environment variable.')
    }
    return process.env.INITIA_RPC_URL
}

async function getInitiaDeployerAddress(hexAddr: string): Promise<string> {
    const initiaCmd = 'initiad'
    const initiaRPCUrl = getInitiaRPCUrl()
    const initiaBech32Addr = await getInitiaBech32(initiaCmd, hexAddr)
    const sequenceNumber = await getInitiaSequenceNumber(initiaCmd, initiaBech32Addr, initiaRPCUrl)
    const deployCount = await getInitiaDeployCount(initiaCmd, initiaBech32Addr, initiaRPCUrl)

    // create Buffer(address + 'initia_std::object_code_deployment' + sequenceNumber(u64) + deployCounter(u64) + 0xFE)
    // and do sha256 hash, and return 0x hex string of first 32 bytes

    const sequenceNumberBuffer = Buffer.alloc(8)
    sequenceNumberBuffer.writeBigUInt64LE(sequenceNumber, 0)

    const deployCounterBuffer = Buffer.alloc(8)
    deployCounterBuffer.writeBigUInt64LE(deployCount, 0)

    // return 32 bytes buffer from hex string, padding with leading zeros if necessary
    function to32BytesBuffer(hex: string): Buffer {
        const cleaned = hex.replace(/^0x/, '')
        if (cleaned.length > 64) {
            throw new Error('hex string is longer than 32 bytes')
        }
        const paddedHex = cleaned.padStart(64, '0')
        return Buffer.from(paddedHex, 'hex')
    }

    const combinedBuffer = Buffer.concat([
        to32BytesBuffer(hexAddr),
        Buffer.from([0x22]),
        Buffer.from('initia_std::object_code_deployment', 'utf8'),
        sequenceNumberBuffer,
        deployCounterBuffer,
        Buffer.from([0xfe]),
    ] as Uint8Array[])

    const hash = createHash('sha3-256')
        .update(combinedBuffer as Uint8Array)
        .digest('hex')
    const deployerAddress = '0x' + hash.slice(0, 64) // first 32 bytes in hex

    return deployerAddress
}

async function getInitiaBech32(initiaCommand: string, hexAddr: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const childProcess = spawn(initiaCommand, ['keys', 'parse', hexAddr.replace(/^0x/, ''), '--output', 'json'])
        let stdout = ''

        childProcess.stdout?.on('data', (data) => {
            stdout += data.toString()
        })

        childProcess.on('close', (code) => {
            if (code === 0) {
                const bech32Addrs = JSON.parse(stdout)
                resolve(bech32Addrs.formats[0])
            } else {
                reject(new Error(`initiad keys parse exited with code ${code}`))
            }
        })

        childProcess.on('error', reject)
    })
}

async function getInitiaSequenceNumber(initiaCommand: string, bech32Addr: string, rpcUrl: string): Promise<bigint> {
    return new Promise((resolve, reject) => {
        const childProcess = spawn(initiaCommand, [
            'query',
            'auth',
            'account-info',
            bech32Addr,
            '--node',
            rpcUrl,
            '--output',
            'json',
        ])
        let stdout = ''

        childProcess.stdout?.on('data', (data) => {
            stdout += data.toString()
        })

        childProcess.on('close', (code) => {
            if (code === 0) {
                const accountInfo = JSON.parse(stdout)
                resolve(BigInt(accountInfo.info.sequence) + BigInt(2))
            } else {
                reject(new Error(`initiad query auth account-info exited with code ${code}`))
            }
        })

        childProcess.on('error', reject)
    })
}

async function getInitiaDeployCount(initiaCommand: string, bech32Addr: string, rpcUrl: string): Promise<bigint> {
    return new Promise((resolve, reject) => {
        const childProcess = spawn(initiaCommand, [
            'query',
            'move',
            'resource',
            bech32Addr,
            '0x1::object_code_deployment::DeploymentCounter',
            '--node',
            rpcUrl,
            '--output',
            'json',
        ])
        let stdout = ''

        childProcess.stdout?.on('data', (data) => {
            stdout += data.toString()
        })

        childProcess.on('close', (code) => {
            if (code === 0) {
                const res = JSON.parse(stdout)
                const resource = JSON.parse(res.resource.move_resource)
                resolve(BigInt(resource.data.count))
            } else {
                reject(new Error(`initiad query move resource exited with code ${code}`))
            }
        })

        childProcess.on('error', () => {
            resolve(BigInt(0))
        })
    })
}
