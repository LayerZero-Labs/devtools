import { task, types } from 'hardhat/config'
import { ActionType, HardhatRuntimeEnvironment } from 'hardhat/types'

interface TaskArguments {
    guid: string
    contractName: string
    lengths: string
}

const action: ActionType<TaskArguments> = async ({ guid, lengths, contractName }, hre: HardhatRuntimeEnvironment) => {
    const deployer = (await hre.getNamedAccounts()).deployer
    const signer = await hre.ethers.getSigner(deployer)
    const deployment = await hre.deployments.get(contractName)
    const contract = await hre.ethers.getContractAt(contractName, deployment.address)
    const omniRead = contract.connect(signer)

    let lengthsArray: number[] = []
    let lengthSum = 0
    if (lengths) {
        lengthsArray = lengths.split(',').map((length) => 2 * parseInt(length))
        lengthSum = lengthsArray.reduce((a, b) => a + b, 0)
    }

    // Create filter for ReadRequestReceived event with the specific GUID
    const filter = omniRead.filters.ReadRequestReceived(guid)

    // Get all events matching the filter
    const events = await omniRead.queryFilter(filter)

    if (events.length > 0) {
        const result = await omniRead.functions.getResponse(guid)
        console.log(`Result: ${result}`)
        const resultStr = String(result)
        const r = resultStr.slice(2, resultStr.length)
        if (lengthsArray.length > 0) {
            if (lengthSum === r.length) {
                let cursor = 0
                for (let i = 0; i < lengthsArray.length; i++) {
                    console.log(`Result ${i}: 0x${r.slice(cursor, cursor + lengthsArray[i])}`)
                    cursor += lengthsArray[i]
                }
            } else {
                console.log('Lengths array sum does not match the result length')
            }
        }
    } else {
        console.log('No ReadRequestReceived event found for GUID:', guid)
    }
}

task('response', 'Gets response(s) for read request(s)', action)
    .addParam('guid', 'GUID of the read request', undefined, types.string, false)
    .addParam('lengths', 'Bytes lengths of the request(s) response (CSV)', undefined, types.string, true)
    .addOptionalParam('contractName', 'Name of the contract in deployments folder', 'OmniRead', types.string)
