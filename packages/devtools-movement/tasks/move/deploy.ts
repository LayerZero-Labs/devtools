import { spawn } from 'child_process'
import { assert } from 'console'
import fs from 'fs'

import { Network } from '@aptos-labs/ts-sdk'

import { deploymentFile } from '../shared/types'

import { getLzNetworkStage, parseYaml } from './utils/aptosNetworkParser'
import { getNamedAddresses } from './utils/config'
import path from 'path'

let stdOut = ''
let stdErr = ''

/**
 * @notice Main function to deploy an OFT
 * @dev This function deploys an OFT and creates a deployment file in the deployments directory
 * @dev Wraps the aptos move create-object-and-publish-package command
 * @returns Promise<void>
 */
async function deployMovementContracts(address_name: string, named_addresses: string, configPath: string) {
    const aptosYamlConfig = await parseYaml(configPath)
    const networkStage = aptosYamlConfig.network
    const lzNetworkStage = getLzNetworkStage(networkStage)
    const network = getNetworkFromConfig(aptosYamlConfig)

    const additionalAddresses = getNamedAddresses(lzNetworkStage)
    const namedAddresses = named_addresses ? `${named_addresses},${additionalAddresses}` : additionalAddresses

    const cmd = 'aptos'
    const args = [
        'move',
        'create-object-and-publish-package',
        `--address-name=${address_name}`,
        `--named-addresses=${namedAddresses}`,
    ]

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
                assert(addresses[0] == addresses[1], 'Addresses do not match')
                createDeployment(addresses[0], address_name, network, lzNetworkStage)

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

function getNetworkFromConfig(yamlConfig: {
    account_address: string
    private_key: string
    network: Network
    fullnode: string
    faucet: string
}): string {
    if (yamlConfig.faucet.toLowerCase().includes('movement')) {
        return 'movement'
    } else {
        return 'aptos'
    }
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
    console.log(`Deployment file created at ${aptosDir}/${file_name}.json`)
}

async function checkIfDeploymentExists(network: string, lzNetworkStage: string, contractName: string) {
    const aptosDir = path.join(process.cwd(), 'deployments', `${network}-${lzNetworkStage}`)
    return fs.existsSync(path.join(aptosDir, `${contractName}.json`))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function deploy(args: any, contractName: string) {
    const configPath = args.configPath

    const aptosYamlConfig = await parseYaml(configPath)
    const networkStage = aptosYamlConfig.network
    const lzNetworkStage = getLzNetworkStage(networkStage)
    const network = getNetworkFromConfig(aptosYamlConfig)
    const deploymentExists = await checkIfDeploymentExists(network, lzNetworkStage, contractName)

    if (deploymentExists) {
        if (args.force_deploy === 'true') {
            console.log(`Follow the prompts to complete the deployment ${contractName}`)
            await deployMovementContracts(contractName, args.named_addresses, configPath)
        } else {
            console.log('Skipping deploy - deployment already exists')
        }
    } else {
        console.warn('You are in force deploy mode:')
        console.log(`Follow the prompts to complete the deployment ${contractName}`)
        await deployMovementContracts(contractName, args.named_addresses, configPath)
    }
}
export { deploy }
