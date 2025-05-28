import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

import { Keypair } from '@solana/web3.js'
import { task } from 'hardhat/config'

import { types as devtoolsTypes } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId, endpointIdToNetwork } from '@layerzerolabs/lz-definitions'

import { saveSolanaDeployment } from './index'

interface DeployTaskArgs {
    eid: EndpointId
    programKeypair: string
    programBinary: string
    /**
     * Additional arguments to forward to `solana program deploy`.
     */
    passthroughArgs: string[]
}

/**
 * Deploy the compiled Solana program using the Solana CLI
 * and store the resulting program ID under deployments/solana-<net>/program.json
 */
task('lz:oft:solana:deploy', 'Deploy the Solana OFT program')
    .addParam('eid', 'Solana mainnet (30168) or testnet (40168)', undefined, devtoolsTypes.eid)
    .addParam('programKeypair', 'Path to the program keypair JSON file')
    .addParam('programBinary', 'Path to the compiled program .so file')
    .addVariadicPositionalParam(
        'passthroughArgs',
        'Additional arguments forwarded to `solana program deploy`',
        [],
        devtoolsTypes.string,
        true
    )
    .setAction(async ({ eid, programKeypair, programBinary, passthroughArgs }: DeployTaskArgs) => {
        const args = ['program', 'deploy', '--program-id', programKeypair, programBinary, ...passthroughArgs]
        console.log(`Running: solana ${args.join(' ')}`)
        const res = spawnSync('solana', args, { stdio: 'inherit' })
        if (res.status !== 0) {
            throw new Error('solana program deploy failed')
        }
        const keypair = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(programKeypair, 'utf8'))))
        const programId = keypair.publicKey.toBase58()
        const outDir = path.join('deployments', endpointIdToNetwork(eid))
        if (!existsSync(outDir)) {
            mkdirSync(outDir, { recursive: true })
        }
        const outPath = path.join(outDir, 'program.json')
        writeFileSync(outPath, JSON.stringify({ programId }, null, 4))
        console.log(`Program ID saved to ${outPath}`)
        // call saveSolanaDeployment if user has minted etc.
        try {
            saveSolanaDeployment(eid, programId, '', '', '', '')
        } catch {
            /* ignore if not enough data */
        }
    })
