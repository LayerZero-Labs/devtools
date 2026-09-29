import { task } from 'hardhat/config'
import { utils as ethersUtils } from 'ethers'

/**
 * AI Agent Task — Execute SOP and submit evidence to EvidenceOracle
 *
 * Demonstrates Layer 1 (Evidence Submission):
 *   AI follows SOP → builds evidence package → commits hash on-chain
 *
 * Usage:
 *   pnpm hardhat ai:submit --network eth-sepolia --sop rainfall-trigger-v1
 */
task('ai:submit', 'AI agent executes SOP and submits evidence on-chain')
    .addParam('sop', 'SOP name (must match file in sop/ directory)')
    .setAction(async (taskArgs, hre) => {
        const { sop } = taskArgs
        const sopDoc = require(`../sop/${sop}.json`)
        const [signer] = await hre.ethers.getSigners()

        console.log(`\n🤖 AI Agent executing SOP: ${sop}`)
        console.log(`   Location: ${sopDoc.parameters.location}`)
        console.log(`   Threshold: ${sopDoc.parameters.threshold_mm}mm\n`)

        // Step 1: Fetch weather data (simulated for demo)
        const sources = [
            { name: 'openweathermap.org', rainfall_mm: 6.9, timestamp: Date.now() },
            { name: 'tmd.go.th', rainfall_mm: 7.2, timestamp: Date.now() },
        ]
        console.log(`   📡 Source 1 (${sources[0].name}): ${sources[0].rainfall_mm}mm`)
        console.log(`   📡 Source 2 (${sources[1].name}): ${sources[1].rainfall_mm}mm`)

        // Step 2-5: Execute SOP steps
        const avg = sources.reduce((s, x) => s + x.rainfall_mm, 0) / sources.length
        const divergence = Math.abs(sources[0].rainfall_mm - sources[1].rainfall_mm) / avg * 100
        const conclusion = avg > sopDoc.parameters.threshold_mm ? 1 : 0

        console.log(`   📊 Average: ${avg.toFixed(1)}mm | Divergence: ${divergence.toFixed(1)}%`)
        console.log(`   📋 Conclusion: ${conclusion === 1 ? 'TRIGGER' : 'NO_TRIGGER'}\n`)

        // Build evidence package
        const evidencePackage = {
            sop_version: sop,
            executed_at: new Date().toISOString(),
            steps: sources.map((s, i) => ({
                step: i + 1,
                source: s.name,
                value_mm: s.rainfall_mm,
                timestamp: s.timestamp,
            })),
            computation: { average_mm: avg, divergence_pct: divergence },
            conclusion: conclusion === 1 ? 'TRIGGER' : 'NO_TRIGGER',
        }

        // In production: pin to IPFS. Here we use deterministic hash.
        const evidenceJson = JSON.stringify(evidencePackage)
        const evidenceCid = ethersUtils.keccak256(ethersUtils.toUtf8Bytes(evidenceJson))
        const sopHash = ethersUtils.keccak256(ethersUtils.toUtf8Bytes(JSON.stringify(sopDoc)))
        const conclusionHash = ethersUtils.keccak256(ethersUtils.toUtf8Bytes(evidencePackage.conclusion))

        console.log(`   🔒 Evidence CID: ${evidenceCid.slice(0, 18)}...`)
        console.log(`   🔒 SOP Hash: ${sopHash.slice(0, 18)}...`)

        // Submit on-chain
        const deployment = await hre.deployments.get('EvidenceOracle')
        const oracle = await hre.ethers.getContractAt('EvidenceOracle', deployment.address)

        // Register SOP if not already registered
        const sopData = await oracle.sops(sopHash)
        if (!sopData.active) {
            console.log(`\n   📝 Registering SOP on-chain...`)
            const tx = await oracle.registerSOP(sop, evidenceCid)
            await tx.wait()
            console.log(`   ✅ SOP registered`)
        }

        // Submit decision
        console.log(`   📤 Submitting decision...`)
        const tx = await oracle.submitDecision(evidenceCid, sopHash, conclusionHash, conclusion)
        const receipt = await tx.wait()
        console.log(`   ✅ Decision submitted. Tx: ${receipt.transactionHash}`)
        console.log(`\n   Waiting for verifier approval...`)
    })
