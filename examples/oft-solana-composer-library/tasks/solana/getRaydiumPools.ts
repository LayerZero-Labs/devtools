import {
    Raydium,
    TICK_ARRAY_SIZE,
    TickUtils,
    getPdaAmmConfigId,
    getPdaExBitmapAccount,
    getPdaTickArrayAddress,
} from '@raydium-io/raydium-sdk-v2'
import { PublicKey } from '@solana/web3.js'
import { task } from 'hardhat/config'

import { types as devtoolsTypes } from '@layerzerolabs/devtools-evm-hardhat'

import { deriveConnection } from './index' // <— your helper

import type { EndpointId } from '@layerzerolabs/lz-definitions'

interface GetPoolsTaskArgs {
    eid: EndpointId
    mint1: string
    mint2: string
}

task('lz:raydium:get-pools', 'Fetches Raydium CLMM pool PDAs')
    .addParam('eid', 'Solana mainnet (30168) or testnet (40168)', undefined, devtoolsTypes.eid)
    .addParam('mint1', 'First mint address', undefined, devtoolsTypes.string)
    .addParam('mint2', 'Second mint address', undefined, devtoolsTypes.string)
    .setAction(async ({ eid, mint1, mint2 }: GetPoolsTaskArgs) => {
        // 1) Derive a connection + wallet (Keypair) for the given endpoint
        const { connection } = await deriveConnection(eid)

        // 2) Load the Raydium SDK (defaults to mainnet for fetchPoolByMints, but uses your connection URL)
        const raydium = await Raydium.load({
            connection,
            disableLoadToken: true,
        })

        // 3) Find the pool matching your two mints
        const { data: pools } = await raydium.api.fetchPoolByMints({
            mint1: new PublicKey(mint1),
            mint2: new PublicKey(mint2),
        })
        if (pools.length === 0) {
            console.error('❌ No Raydium CLMM pool found for these mints')
            return
        }
        const poolId = pools[0].id
        console.log('→ Found Pool ID:', poolId)

        // 4) Fetch the on-chain state AND all the PDAs (tick arrays, vaults, etc.) in one RPC call
        const { poolInfo, poolKeys } = await raydium.clmm.getPoolInfoFromRpc(poolId)

        // poolKeys.id is the Pool State PDA
        const poolStatePda = new PublicKey(poolKeys.id)

        // poolInfo.programId (or poolKeys.programId in the raw on-chain output) is the CLMM program
        const clmmProgramId = new PublicKey(poolInfo.programId)

        // Derive the authority PDA
        const [authorityPda] = PublicKey.findProgramAddressSync([poolStatePda.toBuffer()], clmmProgramId)

        // derive the amm config PDA
        const ammConfigPda = getPdaAmmConfigId(clmmProgramId, poolInfo.config.index).publicKey

        // derive the tick-array–bitmap PDA + bump
        const { publicKey: tickBitmapPda, nonce: tickBitmapBump } = getPdaExBitmapAccount(clmmProgramId, poolStatePda)

        console.log('Pool Info:', JSON.stringify(poolInfo, null, 2))

        // 2) extract tick info
        const {
            config: { tickSpacing },
        } = poolInfo
        const tickCurrent = (poolInfo as any).tickCurrent
        const centralStart = TickUtils.getTickArrayStartIndexByTick(tickCurrent, tickSpacing)
        const fullWidth = tickSpacing * TICK_ARRAY_SIZE

        // 3) derive lower & upper
        const lowerIndex = centralStart - fullWidth
        const upperIndex = centralStart + fullWidth
        const tickLowerPDA = getPdaTickArrayAddress(clmmProgramId, poolStatePda, lowerIndex).publicKey
        const tickUpperPDA = getPdaTickArrayAddress(clmmProgramId, poolStatePda, upperIndex).publicKey
        const tickCurrentPDA = getPdaTickArrayAddress(clmmProgramId, poolStatePda, centralStart).publicKey

        // …after you do:
        // const { poolInfo, poolKeys } = await raydium.clmm.getPoolInfoFromRpc(poolId);
        // 5) Print them out
        console.log('\n🔑 Raydium CLMM PDAs:')
        console.log('  Pool Program ID: ', poolInfo.programId)
        console.log('  Pool ID: ', poolId)
        console.log('  Pool State PDA:   ', poolStatePda)
        console.log('  AMM Config PDA:   ', ammConfigPda)
        console.log('  Observation PDA:  ', poolKeys.observationId)
        console.log('  Tick Arrays:')
        console.log('  Tick Lower PDA: ', tickLowerPDA)
        console.log('  Tick Current PDA: ', tickCurrentPDA)
        console.log('  Tick Upper PDA: ', tickUpperPDA)
        console.log('tick bitmap PDA:', tickBitmapPda.toBase58(), 'bump:', tickBitmapBump)
        console.log('tickBitmapPda', tickBitmapPda.toString())
        // for (const [startTick, addr] of Object.entries(poolKeys.tickArrays)) {
        //   console.log(`    @ startTick=${startTick}: ${addr.toBase58()}`);
        // }
        console.log('  Vault A PDA:      ', poolKeys.vault.A)
        console.log('  Vault B PDA:      ', poolKeys.vault.B)
        console.log('  Pool Authority:   ', authorityPda)
    })
