// Import necessary modules and types
import { BigNumber, BigNumberish, BytesLike } from 'ethers'
import { ethers } from 'ethers'
import { task } from 'hardhat/config'

import { types } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'

// Define interfaces for task arguments and parameters
interface Args {
    oapp: string // Contract address of the OApp
    message: string // The message to send
    toEid: EndpointId // Destination endpoint ID (uint16)
    extraOptions?: string // Optional extra options as hex string
}

interface SendParam {
    dstChainId: number // Destination chain ID (uint16)
    message: string // The message to send
    adapterParams: BytesLike // Additional adapter parameters
}

interface MessagingFee {
    nativeFee: BigNumberish
    zroFee: BigNumberish
}

// Define the Hardhat task
task('lz:lzapp:send', 'Sends a message using an lzapp (Endpoint V1)')
    .addParam('message', 'The message to send', undefined, types.string)
    .addParam('toEid', 'Destination endpoint ID', undefined, types.int)
    .addOptionalParam('extraOptions', 'Extra options for the send operation (hex string)', '0x', types.string)
    .setAction(async (taskArgs: Args, hre) => {
        const { message, toEid, extraOptions } = taskArgs

        // Convert toEid to number and ensure it fits in uint16
        const dstChainId = Number(toEid)
        if (dstChainId < 0 || dstChainId > 65535) {
            throw new Error('toEid must fit within uint16 (0 - 65535)')
        }

        // Process extraOptions
        const adapterParams: BytesLike =
            extraOptions && extraOptions !== '0x' ? ethers.utils.arrayify(extraOptions) : ethers.utils.arrayify('0x')

        // Instantiate the OApp contract
        const lzapp = await hre.deployments.get('MyLzApp')
        const lzappContract = await hre.ethers.getContractAt('MyLzApp', lzapp.address)

        // Prepare the send parameters
        const sendParam: SendParam = {
            dstChainId: dstChainId,
            message: message,
            adapterParams: adapterParams,
        }

        const feeQuote: MessagingFee = await lzappContract.estimateFee(
            sendParam.dstChainId,
            sendParam.message,
            false, // _useZro set to false
            sendParam.adapterParams
        )
        const nativeFee: BigNumber = BigNumber.from(feeQuote.nativeFee)
        const zroFee: BigNumber = BigNumber.from(feeQuote.zroFee)

        console.log(`Estimated Fees for Sending Message:`)
        console.log(`- Native Fee: ${ethers.utils.formatEther(nativeFee)} ETH`)
        console.log(`- ZRO Token Fee: ${zroFee.toString()} ZRO`)

        // Optional: If your contract requires ZRO tokens, ensure the signer has approved sufficient allowance.
        // This example assumes _useZro is false, so only native fees are required.

        // Execute the sendMessage operation
        const sendTx = await lzappContract.sendMessage(
            sendParam.dstChainId,
            sendParam.message,
            sendParam.adapterParams,
            {
                value: nativeFee, // Paying the native fee
            }
        )

        console.log(`Send transaction initiated. Tx hash: https://layerzeroscan.com/tx/${sendTx.hash}`)
    })
