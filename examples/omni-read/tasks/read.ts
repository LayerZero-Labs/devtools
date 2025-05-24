import { BigNumber } from 'ethers'
import { task, types } from 'hardhat/config'
import { ActionType, HardhatRuntimeEnvironment } from 'hardhat/types'

interface TaskArguments {
    targetEids: string
    isBlockNums: string
    blockNumOrTimestamps: string
    confirmations: string
    tos: string
    calldatas: string
    readGasLimit: number
    returnDataSize: number
    msgValue: number
    identifier: string
    contractName: string
    ether: boolean
}

const action: ActionType<TaskArguments> = async (
    {
        targetEids,
        isBlockNums,
        blockNumOrTimestamps,
        confirmations,
        tos,
        calldatas,
        readGasLimit,
        returnDataSize,
        msgValue,
        identifier,
        contractName,
        ether,
    },
    hre: HardhatRuntimeEnvironment
) => {
    const deployer = (await hre.getNamedAccounts()).deployer
    const signer = await hre.ethers.getSigner(deployer)
    const deployment = await hre.deployments.get(contractName)
    const contract = await hre.ethers.getContractAt(contractName, deployment.address)
    const omniRead = contract.connect(signer)

    const targetEidsArray = targetEids.split(',').map((eid) => parseInt(eid))
    const isBlockNumsArray = isBlockNums.split(',').map((isBlockNum) => Boolean(isBlockNum))
    const blockNumOrTimestampsArray = blockNumOrTimestamps
        .split(',')
        .map((blockNumOrTimestamp) => parseInt(blockNumOrTimestamp))
    const confirmationsArray = confirmations.split(',').map((confirmation) => parseInt(confirmation))
    const tosArray = tos.split(',')
    const calldatasArray = calldatas.split(',')

    if (
        targetEidsArray.length !== isBlockNumsArray.length ||
        targetEidsArray.length !== blockNumOrTimestampsArray.length ||
        targetEidsArray.length !== confirmationsArray.length ||
        targetEidsArray.length !== tosArray.length ||
        targetEidsArray.length !== calldatasArray.length
    ) {
        throw new Error('All arrays must be of the same length')
    }

    const readRequests = []
    for (let i = 0; i < targetEidsArray.length; i++) {
        readRequests.push({
            targetEid: BigNumber.from(targetEidsArray[i]),
            isBlockNum: isBlockNumsArray[i],
            blockNumOrTimestamp: BigNumber.from(blockNumOrTimestampsArray[i]),
            confirmations: BigNumber.from(confirmationsArray[i]),
            to: tosArray[i],
            callData: calldatasArray[i],
        })
    }

    const bigNumberGasLimit = BigNumber.from(readGasLimit)
    const bigNumberReturnDataSize = BigNumber.from(returnDataSize)
    let bigNumberMsgValue: BigNumber
    if (ether) {
        bigNumberMsgValue = hre.ethers.utils.parseEther(msgValue.toString())
    } else {
        bigNumberMsgValue = BigNumber.from(msgValue)
    }

    let txResponse: any
    if (targetEidsArray.length === 1) {
        const [msgFee] = await omniRead.functions.quoteSingle(
            readRequests,
            bigNumberGasLimit,
            bigNumberReturnDataSize,
            bigNumberMsgValue
        )
        txResponse = await omniRead.functions.readSingle(
            readRequests,
            bigNumberGasLimit,
            bigNumberReturnDataSize,
            bigNumberMsgValue,
            identifier,
            {
                value: msgFee.nativeFee,
            }
        )
    } else {
        const [msgFee] = await omniRead.functions.quoteBatch(
            readRequests,
            bigNumberGasLimit,
            bigNumberReturnDataSize,
            bigNumberMsgValue
        )
        txResponse = await omniRead.functions.readBatch(
            readRequests,
            bigNumberGasLimit,
            bigNumberReturnDataSize,
            bigNumberMsgValue,
            identifier,
            {
                value: msgFee.nativeFee,
            }
        )
    }

    const txReceipt = await txResponse.wait()
    console.log(`Tx Hash: ${txReceipt.transactionHash}`)

    // Get the ReadRequestSent event
    const event = txReceipt.events?.find((event: any) => event.event === 'ReadRequestSent')
    if (event) {
        console.log('Request GUID:', event.args.guid)
    }
}

task('read', 'Sends read request(s)', action)
    .addParam('targetEids', 'EID targets for read requests (CSV)', undefined, types.string, false)
    .addParam(
        'isBlockNums',
        'Whether the block number or timestamp is used for read requests (CSV)',
        undefined,
        types.string,
        false
    )
    .addParam(
        'blockNumOrTimestamps',
        'Block number or timestamp for read requests (CSV)',
        undefined,
        types.string,
        false
    )
    .addParam('confirmations', 'Confirmations for read requests (CSV)', undefined, types.string, false)
    .addParam('tos', 'To addresses for read requests (CSV)', undefined, types.string, false)
    .addParam('calldatas', 'Calldata for read requests (CSV)', undefined, types.string, false)
    .addParam('readGasLimit', 'Gas limit for read requests', 500_000, types.int, true)
    .addParam('returnDataSize', 'Return data size for read requests', undefined, types.int, false)
    .addParam('msgValue', 'Message value for read requests', 0, types.int, true)
    .addParam(
        'identifier',
        'Identifier for read requests',
        '0x0000000000000000000000000000000000000000000000000000000000000000',
        types.string,
        true
    )
    .addOptionalParam('contractName', 'Name of the contract in deployments folder', 'OmniRead', types.string)
    .addFlag('ether', 'Use ether instead of wei for call value and transfer value')
