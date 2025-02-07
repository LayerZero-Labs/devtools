import { spawn } from 'child_process'

import { getNamedAddresses } from './utils/config'
import fs from 'fs'
import path from 'path'

let stdErr = ''

/**
 * @notice Main function to build an OFT
 * @dev Wraps the aptos move build command
 * @returns Promise<void>
 */
async function buildMovementContracts(named_addresses: string, chain: string, stage: string) {
    // Get additional named addresses and combine with provided ones
    const additionalAddresses = getNamedAddresses(chain, stage)
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

async function build(
    chainName: string,
    forceBuild: boolean,
    namedAddresses: string,
    addressName: string,
    stage: string
) {
    if (chainName === 'aptos' || chainName === 'movement') {
        try {
            const version = await getAptosVersion()
            const MIN_VERSION = '6.0.1'

            if (!compareVersions(version, MIN_VERSION)) {
                console.error(`❌ Aptos CLI version too old. Required: ${MIN_VERSION} or newer, Found: ${version}`)
                return
            }
            console.log(`🚀 Aptos CLI version ${version} is compatible.`)
        } catch (error) {
            console.error('🚨 Failed to check Aptos CLI version:', error)
            return
        }
    } else {
        throw new Error(`Chain ${chainName}-${stage} not supported for build.`)
    }

    const buildPath = path.join(process.cwd(), 'build', addressName)

    if (!fs.existsSync(buildPath) || forceBuild) {
        console.log('Building contracts\n')
        await buildMovementContracts(namedAddresses, chainName, stage)
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
