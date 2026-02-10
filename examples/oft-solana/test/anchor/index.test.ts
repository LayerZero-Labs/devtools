import './got-shim.cjs'
import 'mocha'

import fs from 'fs'
import { ChildProcess, type SpawnOptions, spawn } from 'node:child_process'
import path from 'path'
import { env } from 'process'

import {
    Context,
    Program,
    Umi,
    createNullContext,
    createSignerFromKeypair,
    generateSigner,
    publicKeyBytes,
    sol,
} from '@metaplex-foundation/umi'
import { createUmi } from '@metaplex-foundation/umi-bundle-defaults'
import { Connection, Keypair } from '@solana/web3.js'
import axios from 'axios'

import { UMI } from '@layerzerolabs/lz-solana-sdk-v2'
import { OftPDA, oft } from '@layerzerolabs/oft-v2-solana-sdk'

import { DST_EID, OFT_PROGRAM_ID, SRC_EID, dvns, endpoint, executor, priceFeed, uln } from './constants'
import { createOftKeySets } from './helpers'
import { OftKeySets, TestContext } from './types'

type SurfnetProgram = {
    name: string
    id: string
    binary?: string
    keypairEnv?: string
}

const RPC_PORT = env.SURFPOOL_RPC_PORT ?? '13033'
const RPC_HOST = env.SURFPOOL_HOST ?? '127.0.0.1'
const WS_PORT = env.SURFPOOL_WS_PORT ?? `${Number(RPC_PORT) + 1}`
const RPC = `http://${RPC_HOST}:${RPC_PORT}`
const UPSTREAM_RPC_URL = env.SURFPOOL_RPC_URL ?? 'https://api.mainnet-beta.solana.com'
const USE_LOCAL_PROGRAMS = env.SURFPOOL_USE_LOCAL_PROGRAMS === '1'
const SURFPOOL_OFFLINE = env.SURFPOOL_OFFLINE === '1'
const SYSTEM_PROGRAM_ID = '11111111111111111111111111111111'
const EMPTY_ACCOUNT_DATA_HEX = ''
const SURFPOOL_LOG = path.join(__dirname, '../../target/surfpool.log')
const JUNK_KEYPAIR_PATH = path.join(__dirname, '../../junk-id.json')
const OFT_PROGRAM_PATH = path.join(__dirname, '../../target/deploy/oft.so')
const OFT_KEYPAIR_PATH = path.join(__dirname, '../../target/deploy/oft-keypair.json')
const TARGET_PROGRAMS_DIR = path.join(__dirname, '../../target/programs')
const DVN_PROGRAM_IDS = dvns.map((dvn) => dvn.toString())

const LAYERZERO_PROGRAMS: SurfnetProgram[] = [
    {
        name: 'endpoint',
        id: endpoint.programId.toString(),
        binary: 'endpoint.so',
        keypairEnv: 'LZ_ENDPOINT_PROGRAM_KEYPAIR',
    },
    {
        name: 'uln',
        id: uln.programId.toString(),
        binary: 'uln.so',
        keypairEnv: 'LZ_ULN_PROGRAM_KEYPAIR',
    },
    {
        name: 'executor',
        id: executor.programId.toString(),
        binary: 'executor.so',
        keypairEnv: 'LZ_EXECUTOR_PROGRAM_KEYPAIR',
    },
    {
        name: 'pricefeed',
        id: priceFeed.programId.toString(),
        binary: 'pricefeed.so',
        keypairEnv: 'LZ_PRICEFEED_PROGRAM_KEYPAIR',
    },
    ...DVN_PROGRAM_IDS.map((id, index) => ({
        name: DVN_PROGRAM_IDS.length > 1 ? `dvn-${index + 1}` : 'dvn',
        id,
        binary: 'dvn.so',
        keypairEnv: 'LZ_DVN_PROGRAM_KEYPAIR',
    })),
]

let globalContext: TestContext
let globalUmi: Umi | Context
let surfpoolProcess: ChildProcess

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

describe('OFT Solana Tests', function () {
    this.timeout(300000)

    before(async function () {
        console.log('Setting up test environment...')

        surfpoolProcess = await startSurfnet()
        await setupPrograms()

        globalContext = await createGlobalTestContext()
        globalUmi = globalContext.umi

        console.log('Test environment ready.')
    })

    after(async function () {
        console.log('Cleaning up test environment...')
        globalUmi = createNullContext()
        if (globalContext) {
            globalContext.umi = globalUmi
        }
        await sleep(2000)
        if (surfpoolProcess) {
            surfpoolProcess.kill('SIGKILL')
        }
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
    assertFileExists(JUNK_KEYPAIR_PATH, 'junk keypair')
    assertFileExists(OFT_PROGRAM_PATH, 'OFT program binary')
    assertFileExists(OFT_KEYPAIR_PATH, 'OFT program keypair')

    if (SURFPOOL_OFFLINE && !USE_LOCAL_PROGRAMS) {
        throw new Error('SURFPOOL_OFFLINE requires SURFPOOL_USE_LOCAL_PROGRAMS=1 for local program deployment.')
    }

    if (USE_LOCAL_PROGRAMS) {
        if (DVN_PROGRAM_IDS.length > 1) {
            throw new Error('Local Surfnet mode supports a single DVN program ID. Set LZ_DVN_PROGRAM_IDS accordingly.')
        }
        await deployLocalLayerZeroPrograms()
    } else {
        console.log(`Priming LayerZero programs from ${UPSTREAM_RPC_URL}...`)
        for (const program of LAYERZERO_PROGRAMS) {
            console.log(`  Cloning ${program.name}...`)
            await cloneProgramAccount(program.id)
        }
        await resetInfrastructureAccounts()
    }

    const oftProgramId = OFT_PROGRAM_ID.toString()
    const hasOftProgram = USE_LOCAL_PROGRAMS
        ? await accountExists(oftProgramId)
        : await tryCloneProgramAccount(oftProgramId, 'oft')

    if (!hasOftProgram) {
        await ensureOftProgramAuthority(oftProgramId)
        console.log('Deploying OFT program to Surfnet...')
        await deployProgram(OFT_KEYPAIR_PATH, OFT_PROGRAM_PATH)
    }
}

async function startSurfnet(): Promise<ChildProcess> {
    assertFileExists(JUNK_KEYPAIR_PATH, 'junk keypair')
    const args = [
        'start',
        '-p',
        RPC_PORT,
        '-w',
        WS_PORT,
        '-o',
        RPC_HOST,
        '--no-tui',
        '--no-deploy',
        '--airdrop-keypair-path',
        JUNK_KEYPAIR_PATH,
    ]

    if (SURFPOOL_OFFLINE) {
        args.push('--offline')
    } else {
        args.push('-u', UPSTREAM_RPC_URL)
    }

    console.log(`Starting surfpool (${SURFPOOL_OFFLINE ? 'offline' : `upstream: ${UPSTREAM_RPC_URL}`})...`)
    const logFd = fs.openSync(SURFPOOL_LOG, 'w')
    const surfnetProcess = spawn('surfpool', [...args], {
        stdio: ['ignore', logFd, logFd],
    })

    let surfnetReady = false
    for (let i = 0; i < 60; i++) {
        try {
            await axios.post(RPC, { jsonrpc: '2.0', id: 1, method: 'getVersion' }, { timeout: 5000 })
            console.log('Surfnet started.')
            surfnetReady = true
            break
        } catch (e) {
            await sleep(1000)
            console.log('Waiting for surfnet to start...')
        }
    }

    if (!surfnetReady) {
        surfnetProcess.kill('SIGKILL')
        throw new Error('Surfnet failed to start within 60 seconds')
    }

    return surfnetProcess
}

async function cloneProgramAccount(programId: string): Promise<void> {
    try {
        await callSurfnetRpc('surfnet_cloneProgramAccount', [programId, programId])
    } catch (error) {
        const details = error instanceof Error ? error.message : String(error)
        throw new Error(
            `Failed to clone program ${programId} from ${UPSTREAM_RPC_URL}: ${details}. If these programs are devnet-only, set SURFPOOL_RPC_URL to a devnet RPC.`
        )
    }
}

async function deployLocalLayerZeroPrograms(): Promise<void> {
    console.log('Deploying local LayerZero programs...')
    for (const program of LAYERZERO_PROGRAMS) {
        if (!program.binary || !program.keypairEnv) {
            continue
        }

        const keypairPath = env[program.keypairEnv]
        if (!keypairPath) {
            throw new Error(`Missing ${program.keypairEnv} for local program ${program.name}`)
        }

        const programPath = path.join(TARGET_PROGRAMS_DIR, program.binary)
        assertFileExists(programPath, `${program.name} program binary`)
        assertFileExists(keypairPath, `${program.name} program keypair`)

        if (await accountExists(program.id)) {
            console.log(`  ${program.name} already deployed.`)
            continue
        }

        console.log(`  Deploying ${program.name}...`)
        await deployProgram(keypairPath, programPath)
    }
}

async function deployProgram(keypairPath: string, programPath: string): Promise<void> {
    await runCommand(
        'solana',
        ['program', 'deploy', '--url', RPC, '--keypair', JUNK_KEYPAIR_PATH, '--program-id', keypairPath, programPath],
        { stdio: 'inherit' }
    )
}

async function accountExists(pubkey: string): Promise<boolean> {
    const result = await callSurfnetRpc<{ value: unknown | null }>('getAccountInfo', [pubkey, { encoding: 'base64' }])
    return Boolean(result?.value)
}

export async function callSurfnetRpc<T>(method: string, params?: unknown): Promise<T> {
    const response = await axios.post(RPC, { jsonrpc: '2.0', id: 1, method, params }, { timeout: 30000 })

    if (response.data?.error) {
        const errorMessage = response.data.error?.message ?? JSON.stringify(response.data.error)
        throw new Error(`Surfnet RPC ${method} failed: ${errorMessage}`)
    }

    return response.data?.result as T
}

async function resetInfrastructureAccounts(): Promise<void> {
    const keySets = createOftKeySets(OFT_PROGRAM_ID)
    const oappStores = [keySets.native.oftStore, keySets.adapter.oftStore]
    const remoteEids = [DST_EID, SRC_EID]

    const addresses = [
        // Endpoint PDAs
        endpoint.pda.setting()[0],
        endpoint.eventAuthority,
        endpoint.pda.messageLibraryInfo(uln.pda.messageLib()[0])[0],

        // Uln PDAs
        uln.pda.messageLib()[0],
        uln.pda.setting()[0],
        uln.eventAuthority,

        // Executor & PriceFeed
        executor.pda.config()[0],
        executor.eventAuthority,
        priceFeed.pda.priceFeed()[0],

        // DVN PDAs
        ...dvns.map((dvn) => new UMI.DvnPDA(dvn).config()[0]),
        ...dvns.map((dvn) => new UMI.EventPDA(dvn).eventAuthority()[0]),

        // OApp stores + registries
        ...oappStores,
        ...oappStores.map((oapp) => endpoint.pda.oappRegistry(oapp)[0]),

        // Pathway config/nonce PDAs
        ...oappStores.flatMap((store) =>
            remoteEids.flatMap((remote) => [
                endpoint.pda.defaultSendLibraryConfig(remote)[0],
                endpoint.pda.oappRegistry(store)[0],
                endpoint.pda.sendLibraryConfig(store, remote)[0],
                endpoint.pda.nonce(store, remote, publicKeyBytes(store))[0],
                endpoint.pda.pendingNonce(store, remote, publicKeyBytes(store))[0],
                uln.pda.defaultSendConfig(remote)[0],
                uln.pda.defaultReceiveConfig(remote)[0],
                uln.pda.sendConfig(remote, store)[0],
                uln.pda.receiveConfig(remote, store)[0],
            ])
        ),
    ]

    const unique = dedupeAddresses(addresses)
    for (const address of unique) {
        // Clear forked PDAs so init instructions can recreate them without "account already in use" errors.
        await clearAccount(address.toString())
    }
}

async function clearAccount(pubkey: string): Promise<void> {
    try {
        await callSurfnetRpc('surfnet_setAccount', [
            pubkey,
            {
                data: EMPTY_ACCOUNT_DATA_HEX,
                executable: false,
                lamports: 0,
                owner: SYSTEM_PROGRAM_ID,
                rentEpoch: 0,
            },
        ])
    } catch (error) {
        const details = error instanceof Error ? error.message : String(error)
        throw new Error(`Failed to clear account ${pubkey} with surfnet_setAccount: ${details}`)
    }
}

async function ensureOftProgramAuthority(programId: string): Promise<void> {
    const authority = loadKeypairPublicKey(JUNK_KEYPAIR_PATH)

    try {
        await callSurfnetRpc('surfnet_setProgramAuthority', [programId, authority])
    } catch (error) {
        const details = error instanceof Error ? error.message : String(error)
        console.warn(`Skipping program authority update for OFT: ${details}`)
    }
}

async function tryCloneProgramAccount(programId: string, label: string): Promise<boolean> {
    try {
        await cloneProgramAccount(programId)
        return true
    } catch (error) {
        const details = error instanceof Error ? error.message : String(error)
        if (details.includes('not found')) {
            console.warn(`Program ${label} (${programId}) not found upstream; deploying locally.`)
            return false
        }
        throw error
    }
}

function assertFileExists(filePath: string, label: string): void {
    if (!fs.existsSync(filePath)) {
        throw new Error(`Missing ${label} at ${filePath}`)
    }
}

function loadKeypairPublicKey(filePath: string): string {
    const secret = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as number[]
    const keypair = Keypair.fromSecretKey(Uint8Array.from(secret))
    return keypair.publicKey.toBase58()
}

function dedupeAddresses(addresses: { toString(): string }[]): { toString(): string }[] {
    const seen = new Set<string>()
    return addresses.filter((address) => {
        const key = address.toString()
        if (seen.has(key)) {
            return false
        }
        seen.add(key)
        return true
    })
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

async function runCommand(command: string, args: string[], options?: SpawnOptions): Promise<void> {
    await new Promise<void>((resolve, reject) => {
        const child = spawn(command, args, { stdio: 'inherit', ...options })

        child.on('error', reject)
        child.on('close', (code) => {
            if (code === 0) {
                resolve()
                return
            }
            reject(new Error(`Command failed: ${command} ${args.join(' ')} (exit ${code ?? 'unknown'})`))
        })
    })
}
