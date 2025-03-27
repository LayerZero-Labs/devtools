import { BigNumber, constants } from 'ethers'
import { task, types } from 'hardhat/config'
import { ActionType, HardhatRuntimeEnvironment } from 'hardhat/types'

interface TaskArguments {
    messageType: string
    toEid: number
    callTarget: string
    callValue: number
    callCalldata: string
    transferTo: string
    transferValue: number
    gasLimit: number
    contractName: string
    ether: boolean
}

const action: ActionType<TaskArguments> = async (
    {
        messageType,
        toEid,
        callTarget,
        callValue,
        callCalldata,
        transferTo,
        transferValue,
        gasLimit,
        contractName,
        ether,
    },
    hre: HardhatRuntimeEnvironment
) => {
    const deployer = (await hre.getNamedAccounts()).deployer
    const signer = await hre.ethers.getSigner(deployer)
    const deployment = await hre.deployments.get(contractName)
    const contract = await hre.ethers.getContractAt(contractName, deployment.address)
    const omniCall = contract.connect(signer)

    const messageTypeInt = messageType === 'non-atomic' ? 0 : 1
    if (messageType !== 'non-atomic' && messageType !== 'atomic') {
        throw new Error('Invalid message type')
    }

    if (!transferTo) {
        transferTo = constants.AddressZero
    }
    if (!callTarget) {
        callTarget = constants.AddressZero
    }
    if (callCalldata === '') {
        callCalldata = '0x'
    }

    let callValueBigNumber: BigNumber
    let transferValueBigNumber: BigNumber
    if (ether) {
        callValueBigNumber = hre.ethers.utils.parseEther(callValue.toString())
        transferValueBigNumber = hre.ethers.utils.parseEther(transferValue.toString())
    } else {
        callValueBigNumber = BigNumber.from(callValue)
        transferValueBigNumber = BigNumber.from(transferValue)
    }

    const call = {
        target: callTarget,
        value: callValueBigNumber,
        callData: callCalldata,
    }

    const transfer = {
        to: transferTo,
        value: transferValueBigNumber,
    }

    const bigNumberToEid = BigNumber.from(toEid)
    const bigNumberGasLimit = BigNumber.from(gasLimit)

    const [msgFee] = await omniCall.functions.quote(messageTypeInt, bigNumberToEid, call, transfer, bigNumberGasLimit)
    const txResponse = await omniCall.functions.send(
        messageTypeInt,
        bigNumberToEid,
        call,
        transfer,
        bigNumberGasLimit,
        {
            value: msgFee.nativeFee,
            gasLimit: bigNumberGasLimit,
        }
    )
    const txReceipt = await txResponse.wait()
    console.log(`tx hash: ${txReceipt.transactionHash}`)
}

task('call', 'Sends a transaction', action)
    .addParam('messageType', 'Message type (non-atomic or atomic)', undefined, types.string, false)
    .addParam('toEid', 'Destination endpoint ID', undefined, types.int, false)
    .addOptionalParam('callTarget', 'Call target', undefined, types.string)
    .addOptionalParam('callValue', 'Call value', 0, types.float)
    .addOptionalParam('callCalldata', 'Call calldata', '', types.string)
    .addOptionalParam('transferTo', 'Transfer to', undefined, types.string)
    .addOptionalParam('transferValue', 'Transfer value', 0, types.float)
    .addOptionalParam('gasLimit', 'Gas limit', 500_000, types.int)
    .addOptionalParam('contractName', 'Name of the contract in deployments folder', 'OmniCall', types.string)
    .addFlag('ether', 'Use ether instead of wei for call value and transfer value')
