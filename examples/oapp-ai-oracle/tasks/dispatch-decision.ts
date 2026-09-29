import { task } from 'hardhat/config'
import { Options } from '@layerzerolabs/lz-v2-utilities'

/**
 * Dispatch Task — Send verified decision cross-chain via LayerZero
 *
 * Demonstrates Layer 3 (Distribution):
 *   Threshold met → LayerZero dispatch → target chain receives
 *
 * Usage:
 *   pnpm hardhat dispatch:decision --network eth-sepolia --id 0 --dst-eid 40102
 */
task('dispatch:decision', 'Dispatch verified decision to target chain')
    .addParam('id', 'Decision ID to dispatch')
    .addParam('dstEid', 'LayerZero Endpoint ID of destination chain')
    .setAction(async (taskArgs, hre) => {
        const decisionId = parseInt(taskArgs.id)
        const dstEid = parseInt(taskArgs.dstEid)
        const [signer] = await hre.ethers.getSigners()

        const deployment = await hre.deployments.get('EvidenceOracle')
        const oracle = await hre.ethers.getContractAt('EvidenceOracle', deployment.address)

        const decision = await oracle.decisions(decisionId)
        const threshold = await oracle.threshold()
        console.log(`\n🚀 Dispatching Decision #${decisionId}`)
        console.log(`   Approvals: ${decision.approvals}/${threshold}`)
        console.log(`   Destination EID: ${dstEid}`)

        if (decision.approvals < threshold) {
            console.log(`   ❌ Threshold not met. Need ${threshold} approvals.`)
            return
        }

        // Build LayerZero options (200k gas for execution on destination)
        const options = Options.newOptions().addExecutorLzReceiveOption(200000, 0).toHex()

        // Quote fee
        const fee = await oracle.quoteDispatch(decisionId, dstEid, options)
        console.log(`   💰 Fee: ${hre.ethers.utils.formatEther(fee.nativeFee)} ETH`)

        // Dispatch
        console.log(`   📡 Sending via LayerZero...`)
        const tx = await oracle.dispatch(decisionId, dstEid, options, { value: fee.nativeFee })
        const receipt = await tx.wait()
        console.log(`   ✅ Dispatched! Tx: ${receipt.transactionHash}`)
        console.log(`\n   Track on LayerZeroScan: https://testnet.layerzeroscan.com/tx/${receipt.transactionHash}`)
    })
