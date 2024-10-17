import bs58 from 'bs58'
import { BigNumber } from 'ethers'
import { task, types } from 'hardhat/config'
import { ActionType, HardhatRuntimeEnvironment } from 'hardhat/types'

import { makeBytes32 } from '@layerzerolabs/devtools'

// const getUSD0Address = (networkName: string) => (isSepolia(networkName) ? USD0_SEPOLIA_ADDRESS : USD0_ARBSEP_ADDRESS)

interface TaskArguments {
    dstEid: number
    amount: string
    to: string
}

const action: ActionType<TaskArguments> = async ({ dstEid, amount, to }, hre: HardhatRuntimeEnvironment) => {
    const signer = await hre.ethers.getNamedSigner('deployer')
    const tokenName = 'MyOFT'
    // @ts-ignore
    const token = (await hre.ethers.getContract(tokenName)).connect(signer)
    console.log(`sender token: ${token.address}`)

    // if (isSepolia(hre.network.name)) {
    //     // @ts-ignore
    //     const erc20Token = (await hre.ethers.getContractAt(IERC20, getUSD0Address(hre.network.name))).connect(signer)
    //     const approvalTxResponse = await erc20Token.approve(token.address, amount)
    //     const approvalTxReceipt = await approvalTxResponse.wait()
    //     console.log(`approve: ${amount}: ${approvalTxReceipt.transactionHash}`)
    // }

    const amountLD = BigNumber.from(amount)
    const sendParam = {
        dstEid,
        to: makeBytes32(bs58.decode(to)),
        amountLD: amountLD.toString(),
        minAmountLD: amountLD.mul(9_000).div(10_000).toString(),
        extraOptions: '0x',
        composeMsg: '0x',
        oftCmd: '0x',
    }

    console.dir({ sendParam }, { depth: null })

    const [msgFee] = await token.functions.quoteSend(sendParam, false)
    console.dir(msgFee)
    const txResponse = await token.functions.send(sendParam, msgFee, signer.address, {
        value: msgFee.nativeFee,
        gasLimit: 500_000,
    })
    const txReceipt = await txResponse.wait()
    console.log(`send: ${amount} to ${to}: ${txReceipt.transactionHash}`)
}

task('send', 'Sends a transaction', action)
    .addParam('dstEid', 'Destination endpoint ID', undefined, types.int, false)
    .addParam('amount', 'Amount to send in wei', undefined, types.string, false)
    .addParam('to', 'Recipient address', undefined, types.string, false)
