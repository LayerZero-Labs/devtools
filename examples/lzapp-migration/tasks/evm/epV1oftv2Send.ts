import assert from 'assert'

import { BytesLike } from 'ethers'
import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

import { EndpointId } from '@layerzerolabs/lz-definitions'
import { Options, addressToBytes32 } from '@layerzerolabs/lz-v2-utilities'

import { getLayerZeroScanLink } from '../solana'

interface TaskArguments {
    dstEid: number
    amount: string
    to: string
    contractName: string
}

const action = async function (taskArgs: TaskArguments, hre: HardhatRuntimeEnvironment) {
    const { dstEid, amount, to, contractName } = taskArgs
    const signers = await hre.ethers.getSigners()
    const owner = signers[0]

    // const toAddressBytes = hre.ethers.utils.defaultAbiCoder.encode(['address'], [toAddress])
    const toAddressBytes = addressToBytes32(to)

    // get local contract
    const lzapp = await hre.deployments.get(contractName)
    const epV1OftV2Instance = await hre.ethers.getContractAt(contractName, lzapp.address)
    //
    //
    const packetType = 0
    const minDstGas = await epV1OftV2Instance.minDstGasLookup(dstEid, packetType) // 0 = send, 1 = send_and_call

    // bof TODO: separate out into own script, mention as part of README instructions
    if (minDstGas == 0) {
        const nonZeroGasValue = 1
        console.log(`minDstGas is currently 0. Setting to 1 to bypass gas assertion.`)
        const tx = await epV1OftV2Instance.setMinDstGas(dstEid, packetType, nonZeroGasValue)
        await tx.wait()
    }
    // eof TODO

    assert(minDstGas > 0, 'minDstGas must be a non-0 value to bypass gas assertion part of EndpointV1')

    const GAS_LIMIT = 200_000 // Gas limit for the executor
    const MSG_VALUE_FOR_SOLANA = 2_500_000
    const MSG_VALUE = MSG_VALUE_FOR_SOLANA // msg.value for the lzReceive() function on destination in wei
    const _options = Options.newOptions().addExecutorLzReceiveOption(GAS_LIMIT, MSG_VALUE)
    const adapterParams: BytesLike = _options.toBytes()

    const fees = await epV1OftV2Instance.estimateSendFee(dstEid, toAddressBytes, amount, false, adapterParams)
    console.log(`fees[0] (wei): ${fees[0]} / (eth): ${hre.ethers.utils.formatEther(fees[0])}`)
    const tx = await (
        await epV1OftV2Instance.sendFrom(
            owner.address, // 'from' address to send tokens
            dstEid, // remote LayerZero chainId
            toAddressBytes, // 'to' address to send tokens
            amount, // amount of tokens to send (in wei)
            {
                refundAddress: owner.address,
                zroPaymentAddress: hre.ethers.constants.AddressZero,
                adapterParams: _options.toBytes(), // as workaround for EndpointV1 OFT -> OFT202, we specify options type 3 instead of adapter params
            },
            { value: fees[0] }
        )
    ).wait()
    console.log(
        `Track cross-chain transfer here: ${getLayerZeroScanLink(tx.transactionHash, dstEid == EndpointId.SOLANA_V2_TESTNET)}`
    )
}

task('lz:epv1:send', 'send tokens to another chain', action)
    .addParam('dstEid', 'Destination endpoint ID', undefined, types.int)
    .addParam('amount', 'amount of tokens to send (in wei)', undefined, types.string)
    .addParam('to', 'Recipient address', undefined, types.string, false)
    .addOptionalParam(
        'contractName',
        'Name of the contract in deployments folder',
        'MyEndpointV1OFTV2Mock',
        types.string
    )
