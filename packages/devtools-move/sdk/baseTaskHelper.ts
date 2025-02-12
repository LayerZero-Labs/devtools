import { getNetworkForChainId, EndpointId } from '@layerzerolabs/lz-definitions'
import { getContractNameFromLzConfig, getMoveVMOAppAddress } from '../tasks/move/utils/utils'
import { OFTFactory } from './OFTFactory'
import { getMoveVMPrivateKey, promptUserContractSelection } from '../tasks/move/utils/config'
import { getMoveVMAccountAddress, getMoveVMContracts } from '../tasks/move/utils/config'
import { getLzConfig } from '../tasks/move/utils/config'
import { getConnection } from './moveVMConnectionBuilder'
import { RESTClient } from '@initia/initia.js'
import { Aptos } from '@aptos-labs/ts-sdk'
import { IOFT } from './IOFT'
import { OAppOmniGraphHardhat } from '@layerzerolabs/toolbox-hardhat'
import { spawn } from 'child_process'
import * as path from 'path'

export interface TaskContext {
    accountAddress: string
    privateKey: string
    chain: string
    stage: string
    oAppAddress: string
    oft: IOFT
    moveVMConnection: Aptos | RESTClient
    srcEid: EndpointId
    lzConfig: OAppOmniGraphHardhat
    selectedContract: OAppOmniGraphHardhat['contracts'][number]
    fullConfigPath: string
}

export interface DeployTaskContext {
    accountAddress: string
    privateKey: string
    chain: string
    stage: string
    moveVMConnection: Aptos | RESTClient
    srcEid: EndpointId
    lzConfig: OAppOmniGraphHardhat
    selectedContract: OAppOmniGraphHardhat['contracts'][number]
    fullConfigPath: string
}

export async function initializeTaskContext(configPath: string): Promise<TaskContext> {
    const lzConfig = await getLzConfig(configPath)
    const moveVMContracts = getMoveVMContracts(lzConfig)
    const selectedContract = await promptUserContractSelection(moveVMContracts)
    const network = getNetworkForChainId(selectedContract.contract.eid)
    const chainName = network.chainName
    const stage = network.env
    const accountAddress = getMoveVMAccountAddress(chainName)
    const moveVMConnection = getConnection(chainName, stage)
    const moveVMPrivateKey = getMoveVMPrivateKey(chainName)
    const srcEid = selectedContract.contract.eid
    const contractName = getContractNameFromLzConfig(srcEid, lzConfig)
    const oAppAddress = getMoveVMOAppAddress(contractName, chainName, stage)
    const oft = OFTFactory.create(moveVMConnection, oAppAddress, accountAddress, moveVMPrivateKey, srcEid)
    const fullConfigPath = path.join(process.cwd(), configPath)

    return {
        accountAddress: accountAddress,
        privateKey: moveVMPrivateKey,
        chain: chainName,
        stage,
        oAppAddress,
        oft,
        moveVMConnection,
        srcEid: srcEid,
        lzConfig: lzConfig,
        selectedContract: selectedContract,
        fullConfigPath: fullConfigPath,
    }
}

export async function initializeDeployTaskContext(configPath: string): Promise<DeployTaskContext> {
    const lzConfig = await getLzConfig(configPath)
    const moveVMContracts = getMoveVMContracts(lzConfig)
    const selectedContract = await promptUserContractSelection(moveVMContracts)
    const network = getNetworkForChainId(selectedContract.contract.eid)
    const chainName = network.chainName
    const stage = network.env
    const accountAddress = getMoveVMAccountAddress(chainName)
    const moveVMConnection = getConnection(chainName, stage)
    const moveVMPrivateKey = getMoveVMPrivateKey(chainName)
    const srcEid = selectedContract.contract.eid
    const fullConfigPath = path.join(process.cwd(), configPath)

    return {
        accountAddress: accountAddress,
        privateKey: moveVMPrivateKey,
        chain: chainName,
        stage,
        moveVMConnection,
        srcEid: srcEid,
        lzConfig: lzConfig,
        selectedContract: selectedContract,
        fullConfigPath: fullConfigPath,
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
    let aptosCommand = ''
    if (chain === 'aptos') {
        try {
            aptosCommand = 'aptos'
            const version = await getAptosVersion(aptosCommand)
            const MIN_VERSION = '6.0.1'

            if (!compareVersions(version, MIN_VERSION)) {
                console.error(`❌ Aptos CLI version too old. Required: ${MIN_VERSION} or newer, Found: ${version}`)
            }
            console.log(`🚀 Aptos CLI version ${version} is compatible.`)
        } catch (error) {
            console.error('🚨 Failed to check Aptos CLI version:', error)
        }
    } else if (chain === 'movement') {
        try {
            aptosCommand = '/Users/alexanderliteplo/Documents/aptos-core/target/cli/aptos'
            const version = await getAptosVersion(aptosCommand)
            const MAX_VERSION = '3.5.0'

            if (!compareVersions(version, MAX_VERSION)) {
                console.error(`❌ Aptos CLI version too new. Required: ${MAX_VERSION} or older, Found: ${version}`)
            }
            console.log(`🚀 Aptos CLI version ${version} is compatible.`)
        } catch (error) {
            console.error('🚨 Failed to check Aptos CLI version:', error)
        }
    } else {
        throw new Error(`Chain ${chain}-${stage} not supported for build.`)
    }
    return aptosCommand
}

function compareVersions(installed: string, required: string): boolean {
    const installedParts = installed.split('.').map(Number)
    const requiredParts = required.split('.').map(Number)

    for (let i = 0; i < 3; i++) {
        if (installedParts[i] > requiredParts[i]) {
            return true
        }
        if (installedParts[i] < requiredParts[i]) {
            return false
        }
    }

    return true
}
