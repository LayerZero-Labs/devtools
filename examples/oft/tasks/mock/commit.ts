// tasks/mock/commit.ts
import { Contract, ethers } from 'ethers'
import { parseUnits } from 'ethers/lib/utils'
import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { addressToBytes32 } from '@layerzerolabs/lz-v2-utilities'

interface TaskArgs {
    srcEid: number // EID of the source chain where message originated
    srcOapp: string // Sender address on source chain (hex)
    nonce: string // LayerZero channel nonce (uint64)
    toAddress: string // Receiver on this chain (hex address or bytes32)
    amount: string // Amount to send (human readable units, e.g. "1.5")
    dstEid: number // Destination chain EID
    dstContractName?: string // Name of the destination chain OFT in deployments
}

task('lz:simple-dvn:commit', 'Call commit() on SimpleDVN to commit ULN verification for message')
    .addParam('srcEid', 'Source chain EID', undefined, types.int)
    .addParam('srcOapp', 'Sender app on source chain (hex)', undefined, types.string)
    .addParam('nonce', 'Channel nonce (uint64)', undefined, types.string)
    .addParam('toAddress', 'Receiver on this chain', undefined, types.string)
    .addParam('amount', 'Amount to send (human readable units, e.g. "1.5")', undefined, types.string)
    .addParam('dstEid', 'Destination chain EID', undefined, types.int)
    .addOptionalParam('dstContractName', 'Name of the destination chain OFT in deployments', 'MyOFTMock', types.string)
    .setAction(async (args: TaskArgs, hre: HardhatRuntimeEnvironment) => {
        const { srcEid, srcOapp, nonce, toAddress, amount, dstEid, dstContractName } = args
        const signer = (await hre.ethers.getSigners())[0]

        // Load SimpleDVN (always use the deployed SimpleDVN contract)
        const dvnDep = await hre.deployments.get('SimpleDVN')
        const dvn = new Contract(dvnDep.address, dvnDep.abi, signer)

        // Get the destination OApp address from deployment
        const dstOappDep = await hre.deployments.get(dstContractName || 'MyOFTMock')
        const localOapp = dstOappDep.address

        // Get shared decimals from destination OFT contract
        const dstOft = await hre.ethers.getContractAt('IOFT', localOapp, signer)
        const sharedDecimals: number = await dstOft.sharedDecimals()

        // Parse amount using shared decimals
        const amountUnits = parseUnits(amount, sharedDecimals)

        const srcOAppB32 = addressToBytes32(srcOapp)
        const toB32 = addressToBytes32(toAddress)

        // Rebuild message payload - only bytes32 (to) and uint64 (amount)
        const message = ethers.utils.solidityPack(['bytes32', 'uint64'], [toB32, amountUnits])

        console.log(`\nCalling commit:`)
        console.log(`  srcEid:       ${srcEid}`)
        console.log(`  srcOApp:      ${srcOapp}`)
        console.log(`  nonce:        ${nonce}`)
        console.log(`  toAddress:    ${toAddress}`)
        console.log(`  amount:       ${amount} (${amountUnits.toString()} units, ${sharedDecimals} decimals)`)
        console.log(`  dstEid:       ${dstEid}`)
        console.log(`  localOApp:    ${localOapp}\n`)

        const tx = await dvn.commit(message, nonce, srcEid, srcOAppB32, dstEid, localOapp)
        const receipt = await tx.wait()
        console.log(`\n✅ commit txn: ${receipt.transactionHash}\n`)
    })
