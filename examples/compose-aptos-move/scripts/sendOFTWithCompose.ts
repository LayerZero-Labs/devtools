import * as fs from 'fs'
import * as path from 'path'

import { BigNumber, ethers } from 'ethers'

import 'dotenv/config'

import { makeBytes32 } from '@layerzerolabs/devtools'
import { Options } from '@layerzerolabs/lz-v2-utilities'

type SendParam = {
    dstEid: number
    to: string
    amountLD: ethers.BigNumberish
    minAmountLD: ethers.BigNumberish
    extraOptions: string
    composeMsg: string
    oftCmd: string
}

type MessagingFee = {
    nativeFee: ethers.BigNumberish
    lzTokenFee: ethers.BigNumberish
}

async function sendOFT(
    oft: ethers.Contract,
    dstEid: number,
    aptosComposerAddressBytes32: string,
    amount: ethers.BigNumberish,
    minAmount: ethers.BigNumberish,
    options: string,
    composeMsg: string,
    refundAddress?: string
): Promise<ethers.ContractTransaction> {
    const finalRefundAddress = refundAddress || (await oft.signer.getAddress())
    const userAddress = await oft.signer.getAddress()

    // Check token balance
    const decimals = await oft.decimals()
    const balance = await oft.balanceOf(userAddress)
    console.log(`💰 Token Balance: ${ethers.utils.formatUnits(balance, decimals)} tokens`)

    if (balance.lt(amount)) {
        throw new Error(
            `Insufficient token balance. You have ${ethers.utils.formatUnits(balance, decimals)} tokens but are trying to send ${ethers.utils.formatUnits(amount, decimals)} tokens.`
        )
    }

    const nativeBalance = await oft.provider.getBalance(userAddress)
    console.log(`💰 Native Token Balance: ${ethers.utils.formatEther(nativeBalance)}`)

    console.log(`🚀 Sending ${ethers.utils.formatUnits(amount, 0)} units`)
    console.log(`\t📝 Using OFT at address: ${oft.address}`)
    console.log(`\t👤 From account: ${userAddress}`)
    console.log(`\t🎯 To account (bytes32): ${aptosComposerAddressBytes32}`)
    console.log(`\t🌐 Destination Endpoint ID: ${dstEid}`)
    console.log(`\t🔍 Min amount: ${ethers.utils.formatUnits(minAmount, 0)}`)
    console.log(`\t↩️ Refund address: ${finalRefundAddress}`)

    const sendParam: SendParam = {
        dstEid: dstEid,
        to: aptosComposerAddressBytes32,
        amountLD: amount,
        minAmountLD: minAmount,
        extraOptions: options,
        composeMsg: composeMsg,
        oftCmd: '0x',
    }

    const fee: MessagingFee = await oft.quoteSend(sendParam, false)

    console.log('💰 LayerZero quote received:')
    console.log('\t🏦 Native fee:', ethers.utils.formatEther(fee.nativeFee))
    console.log('\t🪙 LZ token fee:', fee.lzTokenFee.toString())

    if (nativeBalance.lt(fee.nativeFee)) {
        throw new Error(
            `Insufficient native token for gas fees. You have ${ethers.utils.formatEther(nativeBalance)} but need ${ethers.utils.formatEther(fee.nativeFee)}.`
        )
    }

    const tx = await oft.send(sendParam, fee, finalRefundAddress, {
        value: fee.nativeFee,
    })

    console.log('📨 Transaction sent:')
    console.log('\t🔑 Hash:', tx.hash)
    console.log('\t🔍 LayerZero Scan:', `https://layerzeroscan.com/tx/${tx.hash}`)
    console.log('\t📤 From:', tx.from)
    console.log('\t📥 To:', tx.to)
    console.log('\t💵 Value:', ethers.utils.formatEther(tx.value))
    console.log('\t⛽ Gas limit:', tx.gasLimit.toString())

    return tx
}

async function main() {
    // --- Parameters ---
    const srcRpcUrl = 'https://base-rpc.publicnode.com' // Base Mainnet RPC
    const srcOftContractAddress = '0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34' // USDe OFT address on Base
    const destEndpointId = 30108 // Aptos Mainnet endpoint ID
    const aptosComposerAddress = 'YOUR_COMPOSER_ADDRESS'
    const amountToSend = ethers.BigNumber.from('100000000000000000') // 0.1 USDe
    const minAmountToSwapOnDest = ethers.BigNumber.from('9000000000000000') // 0.009 USDe
    const customRefundAddress = undefined

    // This is the wallet we are sending the tokens to after the swap
    // If swap fails, composer.move contract will send the unswapped amount to this wallet
    // See composer.move implementation for more details
    const aptosDestWalletAddress = 'YOUR_APTOS_WALLET_ADDRESS'

    // The OFT contracdt ABI must be loaded here in order for the call to the OFT send function to work
    const abiPath = path.join(__dirname, 'abi.json')
    const abiJson = JSON.parse(fs.readFileSync(abiPath, 'utf8'))
    // --- End Parameters ---

    const composeMsg = ethers.utils.solidityPack(
        ['uint64', 'bytes32'],
        [BigNumber.from(minAmountToSwapOnDest), makeBytes32(aptosDestWalletAddress)]
    )

    const privateKey = process.env.EVM_PRIVATE_KEY
    if (!privateKey) {
        throw new Error('Please set EVM_PRIVATE_KEY environment variable in a .env file')
    }

    // Input validation (basic)
    if (!ethers.utils.isAddress(srcOftContractAddress)) {
        throw new Error(`Invalid OFT Contract Address: ${srcOftContractAddress}`)
    }
    try {
        ethers.utils.hexZeroPad(aptosComposerAddress, 32)
    } catch (e) {
        throw new Error(`Invalid destination address (must be hex): ${aptosComposerAddress}. Error: ${e}`)
    }

    const provider = new ethers.providers.JsonRpcProvider(srcRpcUrl)
    const wallet = new ethers.Wallet(privateKey, provider)

    const oftContract = new ethers.Contract(srcOftContractAddress, abiJson, wallet)

    // Ensure the 'to' address is correctly formatted as bytes32
    const toAddressBytes32 = ethers.utils.hexZeroPad(aptosComposerAddress, 32)

    // Create the options
    const options = Options.newOptions().addExecutorComposeOption(0, 100000, 0).toHex()

    try {
        const tx = await sendOFT(
            oftContract,
            destEndpointId,
            toAddressBytes32,
            amountToSend,
            minAmountToSwapOnDest,
            options,
            composeMsg,
            customRefundAddress || ''
        )

        console.log('Waiting for transaction confirmation...')
        const receipt = await tx.wait()
        console.log(`✅ Transaction confirmed! Block Number: ${receipt.blockNumber}`)
        console.log('Send operation successful!')
    } catch (error: any) {
        console.error('❌ Error during send operation:', error.message || error)
        if (error.reason) console.error('👉 Reason:', error.reason)
        if (error.code) console.error('👉 Code:', error.code)
        if (error.data) console.error('👉 Data:', error.data)
        process.exit(1)
    }
}

main().catch((error) => {
    console.error('💥 Unhandled error in main:', error.message || error)
    process.exit(1)
})
