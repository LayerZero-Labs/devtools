import { spawn } from 'child_process'

import { ArgumentParser } from 'argparse'

import { getLzNetworkStage, parseYaml } from './utils/aptosNetworkParser'
import { getNamedAddresses } from './utils/config'

let stdErr = ''

const parser = new ArgumentParser({
    description: 'A simple CLI tool built with argparse in TypeScript',
})

/**
 * @notice Main function to build an OFT
 * @dev Wraps the aptos move build command
 * @returns Promise<void>
 */
async function main() {
    // read in the first arg passed via the command line
    parser.add_argument('--package-dir', { type: 'str', help: 'Directory of the OFT you want to deploy (oft)' })
    parser.add_argument('--named-addresses', { type: 'str', help: 'deployer account address' })

    const parserArgs = parser.parse_args()
    const network = (await parseYaml()).network
    const lzNetworkStage = getLzNetworkStage(network)

    // Get additional named addresses and combine with provided ones
    const additionalAddresses = getNamedAddresses(lzNetworkStage)
    const namedAddresses = parserArgs.named_addresses
        ? `${parserArgs.named_addresses},${additionalAddresses}`
        : additionalAddresses

    const cmd = 'aptos'
    const args = ['move', 'build', `--package-dir=${parserArgs.package_dir}`, `--named-addresses=${namedAddresses}`]

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

main().catch((error) => {
    console.error('Error:', error)
    process.exit(1)
})
