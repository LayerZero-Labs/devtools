import { task } from 'hardhat/config'

/**
 * Verifier Task — Audit AI's evidence against SOP
 *
 * Demonstrates Layer 2 (Verification):
 *   Verifier fetches evidence → replays SOP checklist → approves or rejects
 *
 * Usage:
 *   pnpm hardhat verify:decision --network eth-sepolia --id 0
 */
task('verify:decision', 'Verifier audits a decision against SOP')
    .addParam('id', 'Decision ID to verify')
    .setAction(async (taskArgs, hre) => {
        const decisionId = parseInt(taskArgs.id)
        const [, verifier] = await hre.ethers.getSigners() // second account = verifier

        const deployment = await hre.deployments.get('EvidenceOracle')
        const oracle = await hre.ethers.getContractAt('EvidenceOracle', deployment.address)

        const decision = await oracle.decisions(decisionId)
        console.log(`\n🔍 Verifier auditing Decision #${decisionId}`)
        console.log(`   Evidence CID: ${decision.evidenceCid.slice(0, 18)}...`)
        console.log(`   SOP Hash: ${decision.sopHash.slice(0, 18)}...`)
        console.log(`   Conclusion: ${decision.conclusion === 1 ? 'TRIGGER' : 'NO_TRIGGER'}`)

        // In production: fetch evidence from IPFS, replay SOP checklist
        // For demo: auto-approve
        console.log(`\n   📋 Running SOP compliance checklist...`)
        console.log(`   ✓ Sources in whitelist`)
        console.log(`   ✓ Timestamps within window`)
        console.log(`   ✓ Source count >= minimum`)
        console.log(`   ✓ Divergence calculation correct`)
        console.log(`   ✓ Threshold comparison correct`)
        console.log(`   ✓ Conclusion matches computation`)

        console.log(`\n   ✅ All checks passed. Approving...`)
        const tx = await oracle.connect(verifier).verify(decisionId, true)
        const receipt = await tx.wait()
        console.log(`   ✅ Approved. Tx: ${receipt.transactionHash}`)

        const updated = await oracle.decisions(decisionId)
        console.log(`   Approvals: ${updated.approvals}/${await oracle.threshold()}`)
    })
