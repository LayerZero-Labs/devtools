import { spawn } from 'child_process'
// import { assert } from 'console'
import fs from 'fs'

import { deploymentFile } from '../shared/types'

import path from 'path'
import type { OAppOmniGraphHardhat } from '@layerzerolabs/toolbox-hardhat'
import { DeployTaskContext } from '../../sdk/baseTaskHelper'
import { getAptosCLICommand, checkInitiaCLIVersion } from './utils/config'
let stdOut = ''
let stdErr = ''

/**
 * @notice Main function to deploy an OFT
 * @dev This function deploys an OFT and creates a deployment file in the deployments directory
 * @dev Wraps the aptos move create-object-and-publish-package command
 * @returns Promise<void>
 */
async function deployMovementContracts(
    userChosenContract: OAppOmniGraphHardhat['contracts'][number],
    addressName: string,
    namedAddresses: string,
    chainName: string,
    stage: string
) {
    let cmd = ''
    let args: string[] = []
    if (chainName === 'aptos' || chainName === 'movement') {
        const aptosCommand = await getAptosCLICommand(chainName, stage)
        cmd = aptosCommand
        args = [
            'move',
            'create-object-and-publish-package',
            `--address-name=${addressName}`,
            `--named-addresses=${namedAddresses}`,
        ]
    } else if (chainName === 'initia') {
        checkInitiaCLIVersion()
        const userAccountName = getInitiaKeyName()

        cmd = 'initiad'
        args = [
            'move',
            'deploy-object',
            addressName,
            `-p=${process.cwd()}`,
            `--named-addresses=${namedAddresses}`,
            `--node=${getInitiaRPCUrl()}`,
            `--from=${userAccountName}`,
            '--gas-prices=0.015uinit',
            '--gas-adjustment=1.4',
            `--chain-id=${getInitiaChainId()}`,
            '--gas=auto',
            '--keyring-backend=test',
            '-y',
        ]
    }

    return new Promise<void>((resolve, reject) => {
        const childProcess = spawn(cmd, args, {
            stdio: ['inherit', 'pipe', 'pipe'], // Inherit stdin, pipe stdout and stderr
        })

        // Capture stdout which contains our deployed address
        childProcess.stdout?.on('data', (data) => {
            const dataStr = data.toString()
            stdOut += dataStr
            process.stdout.write(`${dataStr}`)
        })

        // Capture stderr (this is actually NOT the error output but the interactive prompt)
        childProcess.stderr?.on('data', (data) => {
            const dataStr = data.toString()
            stdErr += dataStr
            process.stderr.write(`${dataStr}`)
        })

        // Handle process close
        childProcess.on('close', (code) => {
            if (code === 0) {
                const addresses = stdOut.match(/0x[0-9a-fA-F]{64}/g)!
                // assert(addresses[0] == addresses[1], 'Addresses do not match')
                createDeployment(addresses[0], userChosenContract.contract.contractName ?? '', chainName, stage)

                resolve()
            } else {
                console.error(`Command failed with code ${code}`)
                console.error('Captured stderr:', stdErr)
                reject(new Error(`Process exited with code ${code}`))
            }
        })

        // Handle errors
        childProcess.on('error', (err) => {
            console.error('Error spawning the process:', err)
            reject(err)
        })
    })
}

function getInitiaKeyName() {
    if (!process.env.INITIA_KEY_NAME) {
        throw new Error('INITIA_KEY_NAME is not set.\n\nPlease set the INITIA_KEY_NAME environment variable.')
    }
    return process.env.INITIA_KEY_NAME
}

function getInitiaRPCUrl() {
    if (!process.env.INITIA_RPC_URL) {
        throw new Error('INITIA_RPC_URL is not set.\n\nPlease set the INITIA_RPC_URL environment variable.')
    }
    return process.env.INITIA_RPC_URL
}

function getInitiaChainId() {
    if (!process.env.INITIA_CHAIN_ID) {
        throw new Error('INITIA_CHAIN_ID is not set.\n\nPlease set the INITIA_CHAIN_ID environment variable.')
    }
    return process.env.INITIA_CHAIN_ID
}

async function createDeployment(deployedAddress: string, file_name: string, network: string, lzNetworkStage: string) {
    fs.mkdirSync('deployments', { recursive: true })
    const aptosDir = `deployments/${network}-${lzNetworkStage}`
    fs.mkdirSync(aptosDir, { recursive: true })

    const deployment: deploymentFile = {
        address: deployedAddress,
        abi: [],
        transactionHash: '',
        receipt: {},
        args: [],
        numDeployments: 1,
        solcInputHash: '',
        metadata: '',
        bytecode: '',
        deployedBytecode: '',
        devdoc: {},
        storageLayout: {},
    }

    fs.writeFileSync(path.join(aptosDir, `${file_name}.json`), JSON.stringify(deployment, null, 2))
    console.log('\n✅ Deployment successful ✅')
}

async function checkIfDeploymentExists(network: string, lzNetworkStage: string, contractName: string) {
    const aptosDir = path.join(process.cwd(), 'deployments', `${network}-${lzNetworkStage}`)
    return fs.existsSync(path.join(aptosDir, `${contractName}.json`))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function deploy(
    taskContext: DeployTaskContext,
    addressName: string,
    forceDeploy: boolean = false,
    namedAddresses: string
) {
    const deploymentExists = await checkIfDeploymentExists(
        taskContext.chain,
        taskContext.stage,
        taskContext.selectedContract.contract.contractName ?? ''
    )

    if (deploymentExists) {
        if (forceDeploy) {
            console.warn('You are in force deploy mode:')
            console.log(
                `Follow the prompts to complete the deployment ${taskContext.selectedContract.contract.contractName}`
            )
            await deployMovementContracts(
                taskContext.selectedContract,
                addressName,
                namedAddresses,
                taskContext.chain,
                taskContext.stage
            )

            if (taskContext.chain === 'initia') {
                await new Promise((resolve) => setTimeout(resolve, 3000))
            }
        } else {
            console.log('Skipping deploy - deployment already exists')
        }
    } else {
        console.log(
            `Follow the prompts to complete the deployment ${taskContext.selectedContract.contract.contractName}`
        )
        await deployMovementContracts(
            taskContext.selectedContract,
            addressName,
            namedAddresses,
            taskContext.chain,
            taskContext.stage
        )

        if (taskContext.chain === 'initia') {
            await new Promise((resolve) => setTimeout(resolve, 3000))
        }
    }
}
export { deploy }
