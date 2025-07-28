// tasks/mock/commit.ts
import { Contract, ethers } from 'ethers'
import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { addressToBytes32 } from '@layerzerolabs/lz-v2-utilities'

interface TaskArgs {
    contractName: string // Name of the deployed SimpleDVN contract
    remoteEid: number // EID of the chain where message originated
    remoteOapp: string // Sender address on source chain (hex)
    nonce: string // LayerZero channel nonce (uint64)
    toAddress: string // Receiver on this chain (hex address or bytes32)
    amountSd: string // Amount in shared-decimals (uint64)
    localEid: number // Local chain EID (destination)
    localOapp: string // Receiver EVM address on this chain
}

task('lz:simple-dvn:commit', 'Call commit() on SimpleDVN to commit ULN verification for message')
    .addParam('contractName', 'Deployed SimpleDVN name', undefined, types.string)
    .addParam('remoteEid', 'Source chain EID', undefined, types.int)
    .addParam('remoteOapp', 'Sender app on source chain (hex)', undefined, types.string)
    .addParam('nonce', 'Channel nonce (uint64)', undefined, types.string)
    .addParam('toAddress', 'Receiver on this chain', undefined, types.string)
    .addParam('amountSd', 'Amount in shared-decimals', undefined, types.string)
    .addParam('localEid', 'Local (dest) chain EID', undefined, types.int)
    .addParam('localOapp', 'Receiver EVM address on this chain', undefined, types.string)
    .setAction(async (args: TaskArgs, hre: HardhatRuntimeEnvironment) => {
        const { contractName, remoteEid, remoteOapp, nonce, toAddress, amountSd, localEid, localOapp } = args
        const signer = (await hre.ethers.getSigners())[0]

        // Load SimpleDVN
        const dvnDep = await hre.deployments.get(contractName)
        const dvn = new Contract(dvnDep.address, dvnDep.abi, signer)

        const PT_SEND = 0
        const remoteOappB32 = addressToBytes32(remoteOapp)
        const toB32 = addressToBytes32(toAddress)
        const localApp = localOapp

        // Rebuild message payload
        const message = ethers.utils.solidityPack(['uint8', 'bytes32', 'uint64'], [PT_SEND, toB32, amountSd])

        console.log(`\nCalling commit:`)
        console.log(`  remoteEid:    ${remoteEid}`)
        console.log(`  remoteOApp:   ${remoteOappB32}`)
        console.log(`  nonce:        ${nonce}`)
        console.log(`  toAddress:    ${toB32}`)
        console.log(`  amountSD:     ${amountSd}`)
        console.log(`  localEid:     ${localEid}`)
        console.log(`  localOApp:    ${localOapp}\n`)

        const tx = await dvn.commit(message, nonce, remoteEid, remoteOappB32, localEid, localOapp)
        const receipt = await tx.wait()
        console.log(`\n✅ commit txn: ${receipt.transactionHash}\n`)
    })
