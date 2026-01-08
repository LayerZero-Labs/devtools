import fs from 'fs'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import path from 'path'

interface FeatureInfo {
    description: string
    id: string
    status: string
}

interface FeaturesResponse {
    features: FeatureInfo[]
}

const execFileAsync = promisify(execFile)

async function fetchFeatures(rpc: string): Promise<FeaturesResponse> {
    const { stdout } = await execFileAsync(
        'solana',
        ['feature', 'status', '-u', rpc, '--display-all', '--output', 'json-compact'],
        { maxBuffer: 10 * 1024 * 1024 }
    )

    return JSON.parse(stdout.trim()) as FeaturesResponse
}

async function generateFeatures(): Promise<void> {
    console.log('Retrieving mainnet feature flags...')

    try {
        const rpcEndpoints = [
            'https://api.mainnet-beta.solana.com',
            'https://solana-rpc.publicnode.com',
            'https://rpc.ankr.com/solana',
        ]

        let features: FeaturesResponse | null = null
        let lastError: unknown = null

        for (const rpc of rpcEndpoints) {
            try {
                console.log(`  Trying ${rpc}...`)
                features = await fetchFeatures(rpc)
                break
            } catch (error) {
                lastError = error
                console.log(`  Failed with ${rpc}, trying next...`)
            }
        }

        if (!features) {
            throw lastError || new Error('All RPC endpoints failed')
        }

        const inactiveFeatures = features.features.filter((feature) => feature.status === 'inactive')

        console.log(`Found ${inactiveFeatures.length} inactive features`)

        const targetDir = path.join(__dirname, '../target/programs')
        const featuresFile = path.join(targetDir, 'features.json')

        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true })
        }

        const featuresData = {
            timestamp: new Date().toISOString(),
            source: 'https://solana-rpc.publicnode.com',
            totalFeatures: features.features.length,
            inactiveFeatures,
            inactiveCount: inactiveFeatures.length,
        }

        fs.writeFileSync(featuresFile, JSON.stringify(featuresData, null, 2))

        console.log(`Features data saved to ${featuresFile}`)
        console.log(`Cached ${inactiveFeatures.length} inactive features for faster test startup`)
    } catch (error) {
        console.error('Failed to retrieve features:', error)
        process.exit(1)
    }
}

;(async (): Promise<void> => {
    await generateFeatures()
})().catch((err: unknown) => {
    console.error(err)
    process.exit(1)
})
