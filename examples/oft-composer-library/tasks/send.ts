import { BigNumberish, BytesLike } from 'ethers'
import { task } from 'hardhat/config'

import { getNetworkNameForEid, types } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { Options, addressToBytes32 } from '@layerzerolabs/lz-v2-utilities'

// Define the interface for task arguments
interface Args {
    amount: string
    to: string
    toEid: EndpointId
    tokenOut: string
    fee: number
}

// Define the interface for SendParam as per your requirements
interface SendParam {
    dstEid: EndpointId // Destination endpoint ID, represented as a number.
    to: BytesLike // Recipient address, represented as bytes.
    amountLD: BigNumberish // Amount to send in local decimals.
    minAmountLD: BigNumberish // Minimum amount to send in local decimals.
    extraOptions: BytesLike // Additional options supplied by the caller to be used in the LayerZero message.
    composeMsg: BytesLike // The composed message for the send() operation.
    oftCmd: BytesLike // The OFT command to be executed, unused in default OFT implementations.
}

// Define the Hardhat task
task('lz:oft:send-and-swap', 'Sends tokens via OFT and performs a swap with UniswapV3Composer on the destination chain')
    .addParam('to', 'Contract address on the destination network', undefined, types.string)
    .addParam('toEid', 'Destination endpoint ID', undefined, types.eid)
    .addParam('amount', 'Amount to transfer in token decimals', undefined, types.string)
    .addParam('tokenOut', 'Address of the token to swap to on the destination chain', undefined, types.string)
    .addParam('fee', 'Uniswap V3 pool fee (e.g., 3000 for 0.3%)', undefined, types.int)
    .setAction(async (taskArgs: Args, { ethers, deployments }) => {
        // Extract task arguments
        const toAddress = taskArgs.to
        const eidB = taskArgs.toEid
        const tokenOut = taskArgs.tokenOut
        const fee = taskArgs.fee

        // Define gas limit and msg.value for the swap on the destination chain
        // These values should be estimated based on the swap complexity and network specifics
        const swapGasLimit = 300000 // Example gas limit; adjust as needed
        const swapMsgValue = ethers.utils.parseEther('0.01') // Example ETH value for gas; adjust as needed

        // Retrieve the OFT deployment information
        const oftDeployment = await deployments.get('MyOFT')

        // Get the signer (deployer) account
        const [signer] = await ethers.getSigners()

        // Instantiate the OFT contract
        const oftContract = new ethers.Contract(oftDeployment.address, oftDeployment.abi, signer)

        // Retrieve the token decimals from the OFT contract
        const decimals = await oftContract.decimals()

        // Parse the amount to transfer into the correct units
        const amount = ethers.utils.parseUnits(taskArgs.amount, decimals)

        // Initialize the options with existing executor options (e.g., LzReceive)
        // and add the new executor option for LzCompose with the gas limit and msg.value
        const options = Options.newOptions()
            .addExecutorComposeOption(0, swapGasLimit, swapMsgValue.toBigInt()) // New LzCompose option
            .toBytes()

        // Define the user initiating the swap as the signer
        const user = await signer.getAddress()

        // Define the recipient of the swap on the destination chain
        const recipient = toAddress

        // Encode the swap parameters into the composeMsg bytes using abi.encode
        const composeMsg = ethers.utils.defaultAbiCoder.encode(
            ['address', 'address', 'uint24', 'address'],
            [user, tokenOut, fee, recipient]
        )

        // Construct the SendParam object with all required parameters
        const sendParam: SendParam = {
            dstEid: eidB,
            to: addressToBytes32(toAddress),
            amountLD: amount,
            minAmountLD: amount, // Adjust minAmountLD based on slippage tolerance
            extraOptions: options,
            composeMsg: composeMsg, // Encoded swap parameters
            oftCmd: ethers.utils.arrayify('0x'), // Assuming no OFT command is needed; adjust if necessary
        }

        // Obtain the fee quote for the send operation
        const feeQuote = await oftContract.quoteSend(sendParam, false)
        const nativeFee = feeQuote.nativeFee

        console.log(
            `Sending ${taskArgs.amount} token(s) to network ${getNetworkNameForEid(eidB)} (Endpoint ID: ${eidB})`
        )

        // Optionally, approve the amount to be spent by the OFT contract
        // This step may be unnecessary if the OFT contract already has the required allowance
        /*
    const erc20 = IERC20(await oftContract.token());
    await erc20.approve(oftDeployment.address, amount);
    */

        // Execute the send operation with the composed parameters and required fees
        const tx = await oftContract.send(sendParam, { nativeFee: nativeFee, lzTokenFee: 0 }, recipient, {
            value: nativeFee, // Include the native fee; adjust if lzTokenFee is used
        })

        console.log(`Send transaction initiated. View on LayerZero Scan: https://layerzeroscan.com/tx/${tx.hash}`)
    })
