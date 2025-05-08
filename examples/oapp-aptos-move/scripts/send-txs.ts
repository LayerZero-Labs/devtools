import { exec } from 'child_process'
import * as fs from 'fs'
import * as util from 'util'

const execPromise = util.promisify(exec)

interface FunctionJson {
    function_id: string
    type_args: any[]
    args: {
        type: string
        value: string[] | number[]
    }[]
}

export async function generateAndRunFunctionJson() {
    // Read addresses and claim amounts
    const addresses: string[] = JSON.parse(fs.readFileSync('addresses.json', 'utf-8'))
    const claimAmounts: number[] = JSON.parse(fs.readFileSync('output.json', 'utf-8')) // TODO point this to correct file

    if (addresses.length !== claimAmounts.length) {
        throw new Error('Mismatch in addresses and claim amounts length')
    }

    const batchSize = 250
    const totalBatches = Math.ceil(addresses.length / batchSize)

    for (let i = 0; i < totalBatches; i++) {
        const startIndex = i * batchSize
        const endIndex = Math.min((i + 1) * batchSize, addresses.length)

        const functionJson: FunctionJson = {
            function_id: '0xc9076103f18ecbb2b5f94a749c163787b9eda532f6675a0c14955abc24ac938f::rewards::add_rewards',
            type_args: [],
            args: [
                {
                    type: 'address',
                    value: addresses.slice(startIndex, endIndex),
                },
                {
                    type: 'u64',
                    value: claimAmounts.slice(startIndex, endIndex),
                },
            ],
        }

        fs.writeFileSync('function.json', JSON.stringify(functionJson, null, 2))

        console.log(`Processing batch ${i + 1} of ${totalBatches}`)

        try {
            const { stdout, stderr } = await execPromise(
                'aptos move run --json-file function.json --profile default --assume-yes'
            )
            console.log('Command output:', stdout)
            if (stderr) console.error('Command error:', stderr)
        } catch (error) {
            console.error(`Error executing command for batch ${i + 1} of ${totalBatches}:`, error)
            process.exit(1) // Stop execution so we know where to resume from
        }

        // Add a delay between batches to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000))
    }
}

generateAndRunFunctionJson().catch(console.error)
