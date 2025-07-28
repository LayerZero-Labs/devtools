// tasks/mock/verify.ts
import { Contract, ethers } from 'ethers'
import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { addressToBytes32 } from '@layerzerolabs/lz-v2-utilities'

interface TaskArgs {
    contractName: string // Name of the deployed SimpleDVN contract
    remoteEid: number // EID of the chain where message originated
    remoteOapp: string // Sender address on source chain (hex, any format)
    nonce: string // LayerZero channel nonce (uint64)
    toAddress: string // Receiver on this chain (hex address or bytes32)
    amountSd: string // Amount in shared-decimals (uint64)
    localEid: number // Local chain EID (destination)
    localOapp: string // Receiver EVM address on this chain
}

task('lz:simple-dvn:verify', 'Call verify() on SimpleDVN to verify a message')
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

        // Constants
        const PT_SEND = 0

        // Format fields
        // remoteOApp provided as hex (could be bytes32 or shorter), pad to 32 bytes
        const remoteOAppB32 = addressToBytes32(remoteOapp)
        // toAddress as bytes32
        const toB32 = addressToBytes32(toAddress)
        // localOApp is EVM address
        const localOApp = localOapp

        // Rebuild raw OFT send payload: PT_SEND || toB32 || amountSD
        const message = ethers.utils.solidityPack(['uint8', 'bytes32', 'uint64'], [PT_SEND, toB32, amountSd])

        console.log(`\nCalling verify:`)
        console.log(`  remoteEid:    ${remoteEid}`)
        console.log(`  remoteOApp:   ${remoteOAppB32}`)
        console.log(`  nonce:        ${nonce}`)
        console.log(`  toAddress:    ${toB32}`)
        console.log(`  amountSD:     ${amountSd}`)
        console.log(`  localEid:     ${localEid}`)
        console.log(`  localOApp:    ${localOApp}\n`)

        const tx = await dvn.verify(message, nonce, remoteEid, remoteOAppB32, localEid, localOApp)
        const receipt = await tx.wait()
        console.log(`\n✅ verify txn: ${receipt.transactionHash}\n`)
    })
