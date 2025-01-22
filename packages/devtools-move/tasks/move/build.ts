import { spawn } from 'child_process'

import { getLzNetworkStage, parseYaml } from './utils/aptosNetworkParser'
import { getNamedAddresses } from './utils/config'
import fs from 'fs'
import path from 'path'

let stdErr = ''

/**
 * @notice Main function to build an OFT
 * @dev Wraps the aptos move build command
 * @returns Promise<void>
 */
async function buildMovementContracts(named_addresses: string) {
    const aptosYamlConfig = await parseYaml()
    const network = aptosYamlConfig.network
    const lzNetworkStage = getLzNetworkStage(network)

    // Get additional named addresses and combine with provided ones
    const additionalAddresses = getNamedAddresses(lzNetworkStage)
    const namedAddresses = named_addresses ? `${named_addresses},${additionalAddresses}` : additionalAddresses

    const cmd = 'aptos'
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function build(args: any, contractName: string = 'oft') {
    const buildPath = path.join(process.cwd(), 'build', contractName)
    const aptosYamlConfig = await parseYaml()
    const accountAddress = aptosYamlConfig.account_address

    if (!fs.existsSync(buildPath) || args.force_build === 'true') {
        if (!args.named_addresses) {
            console.error(
                `Missing --named-addresses flag! - usage based on your aptos config:\n --named-addresses oft=${accountAddress},oft_admin=${accountAddress}`
            )
            return
        }
        console.log('Building contracts\n')
        await buildMovementContracts(args.named_addresses)
    } else {
        console.log('Skipping build - built modules already exist at: ', buildPath)
    }
}

export { build }
