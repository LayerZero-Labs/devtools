import { ArgumentParser } from 'argparse'
import { spawn } from 'child_process'
import { assert } from 'console'

let stdOut = ''
let stdErr = ''

const parser = new ArgumentParser({
    description: 'A simple CLI tool built with argparse in TypeScript',
})

async function main() {
    // read in the first arg passed via the command line
    parser.add_argument('--package-dir', { type: 'str', help: 'Directory of the OFT you want to deploy (oft)' })
    parser.add_argument('--named-addresses', { type: 'str', help: 'Module name of the OFT (oft)' })

    const parserArgs = parser.parse_args()

    const package_dir = parserArgs.package_dir
    const named_addresses = parserArgs.named_addresses

    const cmd = 'aptos'
    const args = ['move', 'build', `--package-dir=${package_dir}`, `--named-addresses=${named_addresses}`]

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
                const addresses = stdOut.match(/0x[0-9a-fA-F]{64}/g)
                assert(addresses[0] == addresses[1], 'Addresses do not match')
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
