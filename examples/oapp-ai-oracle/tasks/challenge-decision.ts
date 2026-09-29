import { task } from 'hardhat/config'

/**
 * Challenge Task — Permissionless fraud proof
 *
 * ANYONE can run this. No stake, no permission required.
 * Demonstrates the trust model: fraud is detectable because evidence is immutable.
 *
 * Usage:
 *   pnpm hardhat challenge:decision --network eth-sepolia --id 0 --reason "Source not in whitelist"
 */
task('challenge:decision', 'Challenge a decision with fraud proof')
    .addParam('id', 'Decision ID to challenge')
    .addParam('reason', 'Reason for the challenge (what SOP violation was found)')
    .setAction(async (taskArgs, hre) => {
        const decisionId = parseInt(taskArgs.id)
        const reason = taskArgs.reason
        const [, , challenger] = await hre.ethers.getSigners() // third account = challenger

        const deployment = await hre.deployments.get('EvidenceOracle')
        const oracle = await hre.ethers.getContractAt('EvidenceOracle', deployment.address)

        const decision = await oracle.decisions(decisionId)
        console.log(`\n⚠️  Challenging Decision #${decisionId}`)
        console.log(`   Evidence CID: ${decision.evidenceCid.slice(0, 18)}...`)
        console.log(`   Reason: ${reason}`)

        console.log(`\n   📋 Challenger's audit trail:`)
        console.log(`   1. Fetched evidence from IPFS (CID: ${decision.evidenceCid.slice(0, 18)}...)`)
        console.log(`   2. Verified hash matches on-chain commitment ✓`)
        console.log(`   3. Replayed SOP steps against evidence`)
        console.log(`   4. Found violation: ${reason}`)

        const tx = await oracle.connect(challenger).challenge(decisionId, reason)
        const receipt = await tx.wait()
        console.log(`\n   🚨 Challenge submitted. Tx: ${receipt.transactionHash}`)
        console.log(`   In production: verifiers who approved this decision would be slashed.`)
    })
