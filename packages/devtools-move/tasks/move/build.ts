import { spawn } from 'child_process'

import { getLzNetworkStage, parseYaml } from './utils/aptosNetworkParser'
import { getCLICmd, getNamedAddresses } from './utils/config'
import fs from 'fs'
import path from 'path'

let stdErr = ''

/**
 * @notice Main function to build an OFT
 * @dev Wraps the aptos move build command
 * @returns Promise<void>
 */
async function buildMovementContracts(named_addresses: string, chain: string) {
    const aptosYamlConfig = await parseYaml()
    const network = aptosYamlConfig.network
    const lzNetworkStage = getLzNetworkStage(network)

    // Get additional named addresses and combine with provided ones
    const additionalAddresses = getNamedAddresses(chain, lzNetworkStage)
    const namedAddresses = named_addresses ? `${named_addresses},${additionalAddresses}` : additionalAddresses

    const cmd = getCLICmd(chain)
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

// Add this new helper function
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
    return true // Equal versions
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function build(args: any, contractName: string = 'oft') {
    const buildPath = path.join(process.cwd(), 'build', contractName)
    const aptosYamlConfig = await parseYaml()
    const accountAddress = aptosYamlConfig.account_address
    if (args.chain === 'aptos') {
        try {
            const version = await getAptosVersion()
            console.log('🚀 aptos version is:', version)
            const MIN_VERSION = '6.0.1'

            if (!compareVersions(version, MIN_VERSION)) {
                console.error(`❌ aptos version too old. Required: ${MIN_VERSION} or newer, Found: ${version}`)
                return
            }
            console.log('🚀 aptos version is compatible')
        } catch (error) {
            console.error('🚨 Failed to check aptos version:', error)
            return
        }
    }

    if (!fs.existsSync(buildPath) || args.force_build === 'true') {
        if (!args.named_addresses) {
            console.error(
                `Missing --named-addresses flag! - usage based on your aptos config:\n --named-addresses oft=${accountAddress},oft_admin=${accountAddress}`
            )
            return
        }
        console.log('Building contracts\n')
        await buildMovementContracts(args.named_addresses, args.chain)
    } else {
        console.log('Skipping build - built modules already exist at: ', buildPath)
    }
}

async function getAptosVersion(): Promise<string> {
    return new Promise((resolve, reject) => {
        const childProcess = spawn('aptos', ['--version'])
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

export { build }
