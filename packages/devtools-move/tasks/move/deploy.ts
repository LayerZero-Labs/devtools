import { spawn } from 'child_process'
import { assert } from 'console'
import fs from 'fs'

import { deploymentFile } from '../shared/types'

import { getNamedAddresses } from './utils/config'
import path from 'path'
import type { OAppOmniGraphHardhat } from '@layerzerolabs/toolbox-hardhat'

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
    const additionalAddresses = getNamedAddresses(chainName, stage)
    namedAddresses = namedAddresses ? `${namedAddresses},${additionalAddresses}` : additionalAddresses
    console.log('namedAddresses', namedAddresses)
    let cmd = ''
    let args: string[] = []
    if (chainName === 'aptos' || chainName === 'movement') {
        cmd = 'aptos'
        args = [
            'move',
            'create-object-and-publish-package',
            `--address-name=${addressName}`,
            `--named-addresses=${namedAddresses}`,
        ]
    } else if (chainName === 'initia') {
        if (!process.env.INITIA_KEY_NAME) {
            throw new Error('INITIA_KEY_NAME is not set.\n\nPlease set the INITIA_KEY_NAME environment variable.')
        }
        const userAccountName = process.env.INITIA_KEY_NAME

        cmd = 'initiad'
        args = [
            'move',
            'deploy-object',
            addressName,
            `--named-addresses=${namedAddresses}`,
            '--node=https://rpc.testnet.initia.xyz:443',
            `--from=${userAccountName}`,
            '--gas-prices=0.015uinit',
            '--gas-adjustment=1.4',
            '--chain-id=initiation-2',
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
                assert(addresses[0] == addresses[1], 'Addresses do not match')
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
    addressName: string,
    namedAddresses: string,
    forceDeploy: boolean = false,
    selectedContract: OAppOmniGraphHardhat['contracts'][number],
    chainName: string,
    stage: string
) {
    const deploymentExists = await checkIfDeploymentExists(
        chainName,
        stage,
        selectedContract.contract.contractName ?? ''
    )

    if (deploymentExists) {
        if (forceDeploy) {
            console.warn('You are in force deploy mode:')
            console.log(`Follow the prompts to complete the deployment ${selectedContract.contract.contractName}`)
            await deployMovementContracts(selectedContract, addressName, namedAddresses, chainName, stage)
        } else {
            console.log('Skipping deploy - deployment already exists')
        }
    } else {
        console.log(`Follow the prompts to complete the deployment ${selectedContract.contract.contractName}`)
        await deployMovementContracts(selectedContract, addressName, namedAddresses, chainName, stage)
    }
}
export { deploy }
