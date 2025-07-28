// tasks/mock/lzReceive.ts
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
    guid?: string // Message GUID (optional, will generate if not provided)
}

async function getEndpointContract(hre: HardhatRuntimeEnvironment): Promise<Contract> {
    const endpointDep = await hre.deployments.get('EndpointV2')
    const signer = (await hre.ethers.getSigners())[0]
    return new Contract(endpointDep.address, endpointDep.abi, signer)
}

task('lz:simple-dvn:lz-receive', 'Call endpoint.lzReceive() to deliver the message to destination OFT')
    .addParam('srcEid', 'Source chain EID', undefined, types.int)
    .addParam('srcOapp', 'Sender app on source chain (hex)', undefined, types.string)
    .addParam('nonce', 'Channel nonce (uint64)', undefined, types.string)
    .addParam('toAddress', 'Receiver on this chain', undefined, types.string)
    .addParam('amount', 'Amount to send (human readable units, e.g. "1.5")', undefined, types.string)
    .addParam('dstEid', 'Destination chain EID', undefined, types.int)
    .addOptionalParam('dstContractName', 'Name of the destination chain OFT in deployments', 'MyOFTMock', types.string)
    .addOptionalParam('guid', 'Message GUID (32-byte hex)', undefined, types.string)
    .setAction(async (args: TaskArgs, hre: HardhatRuntimeEnvironment) => {
        const { srcEid, srcOapp, nonce, toAddress, amount, dstEid, dstContractName, guid } = args
        const signer = (await hre.ethers.getSigners())[0]

        // Get the destination OApp address from deployment
        const dstOappDep = await hre.deployments.get(dstContractName || 'MyOFTMock')
        const localOapp = dstOappDep.address

        // Load the destination OFT contract for decimals
        const oft = new Contract(localOapp, dstOappDep.abi, signer)

        // Get the LayerZero Endpoint contract
        const endpoint = await getEndpointContract(hre)

        // Get shared decimals from destination OFT contract
        const sharedDecimals: number = await oft.sharedDecimals()

        // Parse amount using shared decimals
        const amountUnits = parseUnits(amount, sharedDecimals)

        const PT_SEND = 0
        const srcOappB32 = addressToBytes32(srcOapp)
        const toB32 = addressToBytes32(toAddress)
        const localOappB32 = addressToBytes32(localOapp)

        // Rebuild message payload using parsed amount
        const message = ethers.utils.solidityPack(['uint8', 'bytes32', 'uint64'], [PT_SEND, toB32, amountUnits])

        // Generate GUID if not provided (same as SimpleDVN)
        const messageGuid =
            guid ||
            ethers.utils.keccak256(
                ethers.utils.solidityPack(
                    ['uint64', 'uint32', 'bytes32', 'uint32', 'bytes32'],
                    [nonce, srcEid, srcOappB32, dstEid, localOappB32]
                )
            )

        // Build packet object (based on LayerZero packet structure)
        const packet = {
            version: 1,
            nonce: nonce,
            srcEid: srcEid,
            sender: srcOappB32,
            dstEid: dstEid,
            receiver: localOappB32,
            guid: messageGuid,
            message: message,
        }

        // Empty extra data
        const extraData = '0x'

        console.log(`\nCalling endpoint.lzReceive():`)
        console.log(`  srcEid:       ${srcEid}`)
        console.log(`  srcOapp:      ${srcOapp}`)
        console.log(`  nonce:        ${nonce}`)
        console.log(`  toAddress:    ${toAddress}`)
        console.log(`  amount:       ${amount} (${amountUnits.toString()} units, ${sharedDecimals} decimals)`)
        console.log(`  dstEid:       ${dstEid}`)
        console.log(`  localOapp:    ${localOapp}`)
        console.log(`  guid:         ${messageGuid}`)
        console.log(`  endpoint:     ${endpoint.address}\n`)

        // Call endpoint.lzReceive with packet-based signature
        const tx = await endpoint.lzReceive(packet, localOapp, messageGuid, message, extraData)
        const receipt = await tx.wait()
        console.log(`\n✅ endpoint.lzReceive txn: ${receipt.transactionHash}\n`)
    })
