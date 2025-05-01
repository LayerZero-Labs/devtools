import bs58 from 'bs58'
import { BigNumber, ethers } from 'ethers'
import { task, types } from 'hardhat/config'
import { ActionType, HardhatRuntimeEnvironment } from 'hardhat/types'

import { makeBytes32 } from '@layerzerolabs/devtools'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { Options } from '@layerzerolabs/lz-v2-utilities'

import { getLayerZeroScanLink } from '../solana'

interface TaskArguments {
    dstEid: number
    amount: string
    minAmount: string
    composer: string
    solanaReceiver: string
    contractName: string
}

const action: ActionType<TaskArguments> = async (
    { dstEid, amount, minAmount, composer, solanaReceiver, contractName },
    hre: HardhatRuntimeEnvironment
) => {
    const signer = await hre.ethers.getNamedSigner('deployer')

    // ─── Point at the *existing* USDE IOFT on BSC ─────────────────────────────
    const USDE_ADDRESS = '0x5d3a1Ff2b6BAb83b63cd9AD0787074081a52ef34'
    // we expect `contractName` to match the ABI / interface of an IOFT
    const oft = await hre.ethers.getContractAt(contractName, USDE_ADDRESS, signer)
    // ─────────────────────────────────────────────────────────────────────────

    const amountLD = BigNumber.from(amount)
    // 1) turn your Solana base58 address into a 32-byte hex string
    const receiverBytes = bs58.decode(solanaReceiver) // Uint8Array of length 32
    // 2) solidity-pack your two fields:
    //    - a 64-bit BE integer for minAmountLD
    //    - a full 32-byte receiver pubkey
    const composeMsg = ethers.utils.solidityPack(
        ['uint64', 'bytes32'],
        [BigNumber.from(minAmount), makeBytes32(bs58.decode(composer))]
    )
    const sendParam = {
        dstEid,
        to: makeBytes32(bs58.decode(composer)),
        amountLD: amountLD.toString(),
        minAmountLD: amountLD.toString(),
        extraOptions: Options.newOptions()
            .addExecutorLzReceiveOption(200_000, 2_500_000)
            .addExecutorComposeOption(0, 200_000, 2_500_000)
            .toBytes(),
        composeMsg: composeMsg, // you can build your 112-byte composeMsg here
        oftCmd: '0x',
    }

    // quote how much LayerZero fees you must pay
    const [msgFee] = await oft.functions.quoteSend(sendParam, false)

    // now actually send
    const txResponse = await oft.functions.send(
        sendParam,
        msgFee,
        signer.address, // refund address for any dust
        {
            value: msgFee.nativeFee,
            gasLimit: 500_000,
        }
    )
    const txReceipt = await txResponse.wait()

    console.log(`▶ send ${amount} → ${solanaReceiver}: ${txReceipt.transactionHash}`)
    console.log(
        `🔗 Track it: ${getLayerZeroScanLink(txReceipt.transactionHash, dstEid === EndpointId.SOLANA_V2_TESTNET)}`
    )
}

task('send', 'Send USDE via LayerZero')
    .addParam('dstEid', 'Destination endpoint ID', undefined, types.int, false)
    .addParam('amount', 'Amount to send (in LD)', undefined, types.string, false)
    .addParam('solanaReceiver', 'Solana receiver (base58)', undefined, types.string, false)
    .addParam('composer', 'Solana composer (base58)', undefined, types.string, false)
    .addParam('minAmount', 'Minimum amount to receive (in LD)', undefined, types.string, false)
    .addOptionalParam('contractName', 'Name of the IOFT contract interface', 'MyOFT', types.string)
    .setAction(action)
