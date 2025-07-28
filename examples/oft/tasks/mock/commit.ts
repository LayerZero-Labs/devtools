// tasks/mock/commit.ts
import { Contract, ethers } from 'ethers'
import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { addressToBytes32 } from '@layerzerolabs/lz-v2-utilities'

interface TaskArgs {
    contractName: string // Name of the deployed OFT/OApp contract
    srcEid: number // EID of the source chain where message originated
    remoteOapp: string // Sender address on source chain (hex)
    nonce: string // LayerZero channel nonce (uint64)
    toAddress: string // Receiver on this chain (hex address or bytes32)
    amountSd: string // Amount in shared-decimals (uint64)
    dstEid: number // Destination chain EID
}

task('lz:simple-dvn:commit', 'Call commit() on SimpleDVN to commit ULN verification for message')
    .addParam('contractName', 'Name of the destination chain OFT in deployments', 'MyOFTMock', types.string)
    .addParam('srcEid', 'Source chain EID', undefined, types.int)
    .addParam('remoteOapp', 'Sender app on source chain (hex)', undefined, types.string)
    .addParam('nonce', 'Channel nonce (uint64)', undefined, types.string)
    .addParam('toAddress', 'Receiver on this chain', undefined, types.string)
    .addParam('amountSd', 'Amount in shared-decimals', undefined, types.string)
    .addParam('dstEid', 'Destination chain EID', undefined, types.int)
    .setAction(async (args: TaskArgs, hre: HardhatRuntimeEnvironment) => {
        const { contractName, srcEid, remoteOapp, nonce, toAddress, amountSd, dstEid } = args
        const signer = (await hre.ethers.getSigners())[0]

        // Load SimpleDVN (always use the deployed SimpleDVN contract)
        const dvnDep = await hre.deployments.get('SimpleDVN')
        const dvn = new Contract(dvnDep.address, dvnDep.abi, signer)

        // Get the local OApp address from deployment
        const oappDep = await hre.deployments.get(contractName)
        const localOapp = oappDep.address

        const PT_SEND = 0
        const remoteOappB32 = addressToBytes32(remoteOapp)
        const toB32 = addressToBytes32(toAddress)

        // Rebuild message payload
        const message = ethers.utils.solidityPack(['uint8', 'bytes32', 'uint64'], [PT_SEND, toB32, amountSd])

        console.log(`\nCalling commit:`)
        console.log(`  srcEid:       ${srcEid}`)
        console.log(`  remoteOApp:   ${remoteOappB32}`)
        console.log(`  nonce:        ${nonce}`)
        console.log(`  toAddress:    ${toB32}`)
        console.log(`  amountSD:     ${amountSd}`)
        console.log(`  dstEid:       ${dstEid}`)
        console.log(`  localOApp:    ${localOapp}\n`)

        const tx = await dvn.commit(message, nonce, srcEid, remoteOappB32, dstEid, localOapp)
        const receipt = await tx.wait()
        console.log(`\n✅ commit txn: ${receipt.transactionHash}\n`)
    })
