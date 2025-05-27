import * as fs from 'fs'
import * as path from 'path'

import { ethers } from 'ethers'

import 'dotenv/config'

import { EndpointId } from '@layerzerolabs/lz-definitions'
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

function getNetworkName(endpointId: EndpointId): string {
    const networkNames: Partial<Record<EndpointId, string>> = {
        [EndpointId.SEPOLIA_V2_TESTNET]: 'Sepolia Testnet',
        [EndpointId.AVALANCHE_V2_TESTNET]: 'Avalanche Testnet',
        [EndpointId.AMOY_V2_TESTNET]: 'Amoy Testnet',
        [EndpointId.ETHEREUM_V2_MAINNET]: 'Ethereum Mainnet',
        [EndpointId.AVALANCHE_V2_MAINNET]: 'Avalanche Mainnet',
        [EndpointId.POLYGON_V2_MAINNET]: 'Polygon Mainnet',
    }

    return networkNames[endpointId] || `Unknown Network (EID: ${endpointId})`
}

async function sendOFT(
    oft: ethers.Contract,
    srcEndpointId: EndpointId,
    dstEid: number,
    destWallet: string,
    amount: ethers.BigNumberish,
    minAmount: ethers.BigNumberish,
    options: string,
    refundAddress?: string
): Promise<ethers.ContractTransaction> {
    const finalRefundAddress = refundAddress || (await oft.signer.getAddress())
    const userAddress = await oft.signer.getAddress()

    const srcNetworkName = getNetworkName(srcEndpointId)
    const dstNetworkName = getNetworkName(dstEid)

    console.log(`🌐 Cross-chain transfer: ${srcNetworkName} → ${dstNetworkName}`)
    console.log(`📍 Source Endpoint ID: ${srcEndpointId}`)
    console.log(`📍 Destination Endpoint ID: ${dstEid}`)

    const tokenAddress = await oft.token()
    const tokenContract = new ethers.Contract(
        tokenAddress,
        [
            'function decimals() view returns (uint8)',
            'function balanceOf(address) view returns (uint256)',
            'function allowance(address,address) view returns (uint256)',
            'function approve(address,uint256) returns (bool)',
        ],
        oft.signer
    )

    const decimals = await tokenContract.decimals()
    const balance = await tokenContract.balanceOf(userAddress)
    console.log(`💰 Token Balance: ${ethers.utils.formatUnits(balance, decimals)} tokens`)

    const oftAdapterAllowance = await tokenContract.allowance(userAddress, oft.address)
    console.log(`🔓 OFT Adapter Allowance: ${ethers.utils.formatUnits(oftAdapterAllowance, decimals)} tokens`)

    if (oftAdapterAllowance.lt(amount)) {
        console.log(
            `⚠️  Insufficient OFT Adapter allowance. Approving ${ethers.utils.formatUnits(amount, decimals)} tokens...`
        )
        const approveTx = await tokenContract.approve(oft.address, amount)
        console.log(`📝 OFT Adapter approval transaction: ${approveTx.hash}`)
        await approveTx.wait()
        console.log(`✅ OFT Adapter approval confirmed`)
    }

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
    console.log(`\t🎯 To account (bytes32): ${destWallet}`)
    console.log(`\t🔍 Min amount: ${ethers.utils.formatUnits(minAmount, 0)}`)
    console.log(`\t↩️ Refund address: ${finalRefundAddress}`)

    const sendParam: SendParam = {
        dstEid: dstEid,
        to: destWallet,
        amountLD: amount,
        minAmountLD: minAmount,
        extraOptions: options,
        composeMsg: '0x',
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
        gasLimit: 500000,
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

async function getAbiPath(endpointId: EndpointId): Promise<string> {
    const hardhatConfigPath = path.join(__dirname, '..', 'hardhat.config.ts')
    const hardhatConfigContent = fs.readFileSync(hardhatConfigPath, 'utf8')

    const layerzeroConfigPath = path.join(__dirname, '..', 'layerzero.config.ts')
    const layerzeroConfigContent = fs.readFileSync(layerzeroConfigPath, 'utf8')

    const networkNameMatch = hardhatConfigContent.match(
        new RegExp(`'([^']+)':\\s*{[^}]*eid:\\s*EndpointId\\.\\w+\\s*,.*?}`, 'gs')
    )

    let networkName: string | undefined
    if (networkNameMatch) {
        for (const match of networkNameMatch) {
            if (match.includes(`EndpointId.${EndpointId[endpointId]}`)) {
                const nameMatch = match.match(/'([^']+)':\s*{/)
                if (nameMatch) {
                    networkName = nameMatch[1]
                    break
                }
            }
        }
    }

    if (!networkName) {
        throw new Error(`No network found for endpoint ID: ${endpointId}`)
    }

    const contractNameMatch = layerzeroConfigContent.match(
        new RegExp(`eid:\\s*EndpointId\\.${EndpointId[endpointId]}[^}]*contractName:\\s*'([^']+)'`, 'g')
    )

    let contractName: string | undefined
    if (contractNameMatch && contractNameMatch[0]) {
        const nameMatch = contractNameMatch[0].match(/contractName:\s*'([^']+)'/)
        if (nameMatch) {
            contractName = nameMatch[1]
        }
    }

    if (!contractName) {
        throw new Error(`No contract found for endpoint ID: ${endpointId}`)
    }

    return path.join(__dirname, '..', 'deployments', networkName, `${contractName}.json`)
}

async function main() {
    const srcRpcUrl = 'https://gateway.tenderly.co/public/sepolia'
    const srcEndpointId = EndpointId.SEPOLIA_V2_TESTNET
    const destEndpointId = EndpointId.AVALANCHE_V2_TESTNET
    const amountToSend = ethers.BigNumber.from('10000000000000000')
    const minAmountToSwapOnDest = ethers.BigNumber.from('9000000000000000')
    const customRefundAddress = undefined
    const destwalletAddress = '0x462c2AE39B6B0bdB950Deb2BC82082308cF8cB10'

    const abiPath = await getAbiPath(srcEndpointId)
    const deploymentJson = JSON.parse(fs.readFileSync(abiPath, 'utf8'))
    const abiJson = deploymentJson.abi
    const srcOftContractAddress = deploymentJson.address

    const privateKey = process.env.PRIVATE_KEY
    if (!privateKey) {
        throw new Error('Please set PRIVATE_KEY environment variable in a .env file')
    }

    if (!ethers.utils.isAddress(srcOftContractAddress)) {
        throw new Error(`Invalid OFT Contract Address: ${srcOftContractAddress}`)
    }

    const provider = new ethers.providers.JsonRpcProvider(srcRpcUrl)
    const wallet = new ethers.Wallet(privateKey, provider)

    const oftContract = new ethers.Contract(srcOftContractAddress, abiJson, wallet)

    const toAddressBytes32 = ethers.utils.hexZeroPad(destwalletAddress, 32)

    const options = Options.newOptions().addExecutorComposeOption(0, 100000, 0).toHex()

    try {
        const tx = await sendOFT(
            oftContract,
            srcEndpointId,
            destEndpointId,
            toAddressBytes32,
            amountToSend,
            minAmountToSwapOnDest,
            options,
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
