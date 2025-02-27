import { BigNumber, constants } from 'ethers'
import { task, types } from 'hardhat/config'
import { ActionType, HardhatRuntimeEnvironment } from 'hardhat/types'

const etherValue = 10 ** 18

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

    // if (isSepolia(hre.network.name)) {
    //     // @ts-ignore
    //     const erc20Token = (await hre.ethers.getContractAt(IERC20, address)).connect(signer)
    //     const approvalTxResponse = await erc20Token.approve(token.address, amount)
    //     const approvalTxReceipt = await approvalTxResponse.wait()
    //     console.log(`approve: ${amount}: ${approvalTxReceipt.transactionHash}`)
    // }

    let messageTypeInt
    if (messageType === 'non-atomic') {
        messageTypeInt = BigNumber.from(0)
        if (!transferTo || !transferValue) {
            throw new Error('Transfer to and value are required for non-atomic messages')
        }
    } else if (messageType === 'atomic') {
        messageTypeInt = BigNumber.from(1)
        if (!transferTo && transferValue === 0 && (!callTarget || callCalldata === '')) {
            throw new Error('Call target and call data are required for atomic messages')
        }
        if (!callTarget && callCalldata === '' && (!transferTo || transferValue === 0)) {
            throw new Error('Transfer to and value are required for atomic messages')
        }
    } else {
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

    if (ether) {
        callValue = callValue * etherValue
        transferValue = transferValue * etherValue
    }

    const call = {
        target: callTarget,
        value: BigNumber.from(callValue),
        callData: callCalldata,
    }

    const transfer = {
        to: transferTo,
        value: BigNumber.from(transferValue),
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
