import './got-shim.cjs'
import 'mocha'

import { ChildProcess } from 'child_process'
import fs from 'fs'
import path from 'path'
import { env } from 'process'

import {
    Context,
    Program,
    Umi,
    createNullContext,
    createSignerFromKeypair,
    generateSigner,
    sol,
} from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { Connection } from '@solana/web3.js'
import axios from 'axios'
import { $, sleep } from 'zx'

import { OftPDA, oft } from '@layerzerolabs/oft-v2-solana-sdk'

import { OFT_PROGRAM_ID } from './constants'
import { createOftKeySets } from './helpers'
import { OftKeySets, TestContext } from './types'

const RPC_PORT = '13033'
const FAUCET_PORT = '13133'
const RPC = `http://localhost:${RPC_PORT}`

let globalContext: TestContext
let globalUmi: Umi | Context
let solanaProcess: ChildProcess

describe('OFT Solana Tests', function () {
    this.timeout(300000)

    before(async function () {
        console.log('Setting up test environment...')

        await setupPrograms()
        solanaProcess = await startSolanaValidator()

        globalContext = await createGlobalTestContext()
        globalUmi = globalContext.umi

        console.log('Test environment ready.')
    })

    after(async function () {
        console.log('Cleaning up test environment...')
        globalUmi = createNullContext()
        globalContext.umi = globalUmi
        await sleep(2000)
        solanaProcess.kill('SIGKILL')
        console.log('Cleanup completed.')
    })

    describe('LayerZero Infrastructure', function () {
        require('./suites/layerzero-infrastructure.test')
    })

    describe('Instruction Tests', function () {
        require('./suites/init_oft.test')
        require('./suites/set_oft_config.test')
        require('./suites/set_peer_config.test')
        require('./suites/quote_instructions.test')
        require('./suites/send_and_receive.test')
        require('./suites/layerzero-simulation.test')
        require('./suites/withdraw_fee.test')
    })
})

export function getGlobalContext(): TestContext {
    return globalContext
}

export function getGlobalUmi(): Umi | Context {
    return globalUmi
}

export function setGlobalKeys(keys: OftKeySets): void {
    if (globalContext) {
        globalContext.keys = keys
    }
}

export function getGlobalKeys(): OftKeySets {
    return globalContext?.keys as OftKeySets
}

async function setupPrograms(): Promise<void> {
    const programsDir = path.join(__dirname, '../../target/programs')
    env.RUST_LOG = 'solana_runtime::message_processor=debug'
    await $`mkdir -p ${programsDir}`

    const programs = [
        { name: 'endpoint', id: '76y77prsiCMvXMjuoZ5VRrhG5qYBrUMYTE5WgHqgjEn6' },
        { name: 'simple_messagelib', id: '6GsmxMTHAAiFKfemuM4zBjumTjNSX5CAiw4xSSXM2Toy' },
        { name: 'uln', id: '7a4WjyR8VZ7yZz5XJAKm39BUGn5iT9CKcv2pmG9tdXVH' },
        { name: 'executor', id: '6doghB248px58JSSwG4qejQ46kFMW4AMj7vzJnWZHNZn' },
        { name: 'dvn', id: 'HtEYV4xB4wvsj5fgTkcfuChYpvGYzgzwvNhgDZQNh7wW' },
        { name: 'pricefeed', id: '8ahPGPjEbpgGaZx2NV1iG5Shj7TDwvsjkEDcGWjt94TP' },
        { name: 'blocked_messagelib', id: '2XrYqmhBMPJgDsb4SVbjV1PnJBprurd5bzRCkHwiFCJB' },
    ]

    console.log('Downloading LayerZero programs...')
    for (const program of programs) {
        const programPath = `${programsDir}/${program.name}.so`
        if (!fs.existsSync(programPath)) {
            console.log(`  Downloading ${program.name}...`)
            await $({ verbose: true })`solana program dump ${program.id} ${programPath} -u devnet`
        }
    }
}

async function startSolanaValidator(): Promise<ChildProcess> {
    const programsDir = path.join(__dirname, '../../target/programs')

    const args = [
        '--reset',
        '--rpc-port',
        RPC_PORT,
        '--faucet-port',
        FAUCET_PORT,

        '--bpf-program',
        '76y77prsiCMvXMjuoZ5VRrhG5qYBrUMYTE5WgHqgjEn6',
        `${programsDir}/endpoint.so`,

        '--bpf-program',
        '6GsmxMTHAAiFKfemuM4zBjumTjNSX5CAiw4xSSXM2Toy',
        `${programsDir}/simple_messagelib.so`,

        '--bpf-program',
        '7a4WjyR8VZ7yZz5XJAKm39BUGn5iT9CKcv2pmG9tdXVH',
        `${programsDir}/uln.so`,

        '--bpf-program',
        '6doghB248px58JSSwG4qejQ46kFMW4AMj7vzJnWZHNZn',
        `${programsDir}/executor.so`,

        '--bpf-program',
        'HtEYV4xB4wvsj5fgTkcfuChYpvGYzgzwvNhgDZQNh7wW',
        `${programsDir}/dvn.so`,

        '--bpf-program',
        '8ahPGPjEbpgGaZx2NV1iG5Shj7TDwvsjkEDcGWjt94TP',
        `${programsDir}/pricefeed.so`,

        '--bpf-program',
        '2XrYqmhBMPJgDsb4SVbjV1PnJBprurd5bzRCkHwiFCJB',
        `${programsDir}/blocked_messagelib.so`,

        '--bpf-program',
        OFT_PROGRAM_ID,
        `${__dirname}/../../target/deploy/oft.so`,
    ]

    console.log('Loading mainnet feature flags...')
    const inactiveFeatures = await loadInactiveFeatures()
    inactiveFeatures.forEach((f) => {
        args.push('--deactivate-feature', f.id)
    })

    console.log('Starting solana-test-validator...')
    const logFile = path.join(__dirname, '../../target/solana-test-validator.log')
    const process = $.spawn('solana-test-validator', [...args], {
        stdio: ['ignore', fs.openSync(logFile, 'w'), fs.openSync(logFile, 'w')],
    })

    for (let i = 0; i < 60; i++) {
        try {
            await axios.post(RPC, { jsonrpc: '2.0', id: 1, method: 'getVersion' }, { timeout: 5000 })
            console.log('Solana test validator started.')
            break
        } catch (e) {
            await sleep(1000)
            console.log('Waiting for solana to start...')
        }
    }

    return process
}

interface FeatureInfo {
    description: string
    id: string
    status: string
}

interface CachedFeaturesData {
    timestamp: string
    source: string
    totalFeatures: number
    inactiveFeatures: FeatureInfo[]
    inactiveCount: number
}

async function loadInactiveFeatures(): Promise<FeatureInfo[]> {
    const featuresFile = path.join(__dirname, '../../target/programs/features.json')

    if (!fs.existsSync(featuresFile)) {
        console.log('Run: pnpm test:generate-features')
        process.exit(1)
    }

    try {
        const cachedData: CachedFeaturesData = JSON.parse(fs.readFileSync(featuresFile, 'utf-8'))
        console.log(`Loaded ${cachedData.inactiveCount} inactive features from cache.`)
        return cachedData.inactiveFeatures
    } catch (error) {
        console.error('Failed to read features cache:', error)
        process.exit(1)
    }
}

async function createGlobalTestContext(): Promise<TestContext> {
    const connection = new Connection(RPC, 'confirmed')
    const umi = createUmi(connection)
    const program: Program = {
        name: 'oft',
        publicKey: OFT_PROGRAM_ID,
        getErrorFromCode(code: number, cause?: Error) {
            return oft.errors.getOftErrorFromCode(code, this, cause)
        },
        getErrorFromName(name: string, cause?: Error) {
            return oft.errors.getOftErrorFromName(name, this, cause)
        },
        isOnCluster() {
            return true
        },
    }

    const context: TestContext = {
        umi,
        connection,
        executor: createSignerFromKeypair(umi, umi.eddsa.generateKeypair()),
        program,
        programRepo: oft.createOFTProgramRepo(OFT_PROGRAM_ID, umi.rpc),
        pda: new OftPDA(OFT_PROGRAM_ID),
        keys: createOftKeySets(OFT_PROGRAM_ID),
    }
    umi.payer = generateSigner(umi)

    await umi.rpc.airdrop(umi.payer.publicKey, sol(10000))

    return context
}
