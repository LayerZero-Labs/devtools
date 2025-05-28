import { BigNumber } from 'ethers'
import { task, types } from 'hardhat/config'
import { HardhatRuntimeEnvironment } from 'hardhat/types'

interface TaskArguments {
    dstEid: number
    contractName: string
    minGas?: BigNumber
}

// for Endpoint V1 OFT -> OFT202, minDstGas is not used but still needs to be set to a non-zero value, to bypass gas assertion
// we still allow this script to have a user specified minGas value so that it can be used for Endpoint V1 <> Endpoint V1 pathways
const action = async function (taskArgs: TaskArguments, hre: HardhatRuntimeEnvironment) {
    const { dstEid, contractName, minGas: userSpecifiedMinGas } = taskArgs
    // get local contract
    const deployedLzApp = await hre.deployments.get(contractName)
    const deployedLzAppInstance = await hre.ethers.getContractAt(contractName, deployedLzApp.address)

    const PT_SEND = 0
    const minDstGas: BigNumber = await deployedLzAppInstance.minDstGasLookup(dstEid, PT_SEND) // 0 = send, 1 = send_and_call

    const defaultMinGasValue = BigNumber.from(1)
    const newMinGasValue = userSpecifiedMinGas != undefined ? BigNumber.from(userSpecifiedMinGas) : defaultMinGasValue

    if (userSpecifiedMinGas == undefined) {
        console.log(`\nNo --min-gas value specified.`)
        console.log(
            `Defaulting minDstGas for dstEid ${dstEid} to a non-zero value for Endpoint V1 OFT -> OFT202 transfers.`
        )

        if (minDstGas.gt(0)) {
            console.log(`\nminDstGas for ${dstEid} is already set to non-zero value of ${minDstGas}.`)
            return
        }
    } else {
        console.log('User has specified a value for --min-gas')
    }

    console.log(`\nminDstGas for ${dstEid} is currently ${minDstGas}. Setting to ${newMinGasValue}..`)

    const tx = await deployedLzAppInstance.setMinDstGas(dstEid, PT_SEND, newMinGasValue)

    const receipt = await tx.wait()
    console.log(`setMinDstGasTxnHash: ${receipt.transactionHash}`)
}

task('lz:lzapp:set-min-dst-gas', 'set min dst gas (Endpoint V1)', action)
    .addParam('dstEid', 'Destination eid', undefined, types.int)
    .addOptionalParam(
        'contractName',
        'Name of the contract in deployments folder',
        'MyEndpointV1OFTV2Mock',
        types.string
    )
    .addOptionalParam('minGas', 'Min gas value for the destination eid', undefined, types.int)
