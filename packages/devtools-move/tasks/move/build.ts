import { spawn } from 'child_process'

import fs from 'fs'
import path from 'path'
import { DeployTaskContext } from '../../sdk/baseTaskHelper'
import { getAptosCLICommand } from './utils/config'

let stdErr = ''

/**
 * @notice Main function to build an OFT
 * @dev Wraps the aptos move build command
 * @returns Promise<void>
 */
async function buildMovementContracts(namedAddresses: string, chain: string, stage: string, aptosCommand: string) {
    const cmd = aptosCommand
    const args = ['move', 'build', `--named-addresses=${namedAddresses}`]

    return new Promise<void>((resolve, reject) => {
        const childProcess = spawn(cmd, args, {
            stdio: ['inherit', 'pipe', 'pipe'], // Inherit stdin, pipe stdout and stderr
        })

        // Capture stdout which contains our deployed address
        childProcess.stdout?.on('data', (data) => {
            const dataStr = data.toString()
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

async function build(taskContext: DeployTaskContext, forceBuild: boolean, namedAddresses: string) {
    const aptosCommand = await getAptosCLICommand(taskContext.chain, taskContext.stage)

    const buildPath = path.join(process.cwd(), 'build', taskContext.selectedContract.contract.contractName ?? '')

    if (!fs.existsSync(buildPath) || forceBuild) {
        console.log('Building contracts\n')
        await buildMovementContracts(namedAddresses, taskContext.chain, taskContext.stage, aptosCommand)
    } else {
        console.log('Skipping build - built modules already exist at: ', buildPath)
    }
}

export { build }
