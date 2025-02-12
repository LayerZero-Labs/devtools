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
    toEid: EndpointId // Destination endpoint ID
    extraOptions?: string // Optional extra options as hex string
}

interface SendParam {
    dstEid: BigNumberish // Destination endpoint ID
    message: BytesLike // Encoded message payload
    extraOptions: BytesLike // Additional options
}

interface MessagingFee {
    nativeFee: BigNumberish
    lzTokenFee: BigNumberish
}

// Define the Hardhat task
task('lz:oapp:send', 'Sends a message using an OApp (from chain using Endpoint V2')
    .addParam('message', 'The message to send', undefined, types.string)
    .addParam('toEid', 'Destination endpoint ID', undefined, types.bigint)
    .addOptionalParam('extraOptions', 'Extra options for the send operation (hex string)', '0x', types.string)
    .setAction(async (taskArgs, hre) => {
        const oappAddress = taskArgs.oapp
        const message = taskArgs.message
        const dstEid = BigNumber.from(taskArgs.toEid)
        const extraOptions: BytesLike =
            taskArgs.extraOptions && taskArgs.extraOptions !== '0x'
                ? ethers.utils.arrayify(taskArgs.extraOptions)
                : ethers.utils.arrayify('0x')

        // Instantiate the OApp contract
        const oappDeployment = await hre.deployments.get('MyOApp')
        const oappContract = await hre.ethers.getContractAt('MyOApp', oappDeployment.address)

        // Prepare the send parameters
        const sendParam: SendParam = {
            dstEid: dstEid,
            message: ethers.utils.toUtf8Bytes(message),
            extraOptions: extraOptions,
        }

        // Get the quote for the send operation
        const feeQuote: MessagingFee = await oappContract.quote(sendParam.dstEid, message, sendParam.extraOptions)
        const nativeFee: BigNumber = BigNumber.from(feeQuote.nativeFee)
        const lzTokenFee: BigNumber = BigNumber.from(feeQuote.lzTokenFee)

        console.log(
            `Estimated Fees: Native - ${ethers.utils.formatEther(nativeFee)} ETH, LZ Token - ${lzTokenFee.toString()}`
        )

        // Execute the sendMessage operation
        const sendTx = await oappContract.sendMessage(sendParam.dstEid, message, sendParam.extraOptions, {
            value: nativeFee, // Paying the native fee
        })

        console.log(`Send transaction initiated. Tx hash: https://layerzeroscan.com/tx/${sendTx.hash}`)
    })
