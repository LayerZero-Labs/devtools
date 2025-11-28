import { task, types } from 'hardhat/config'
import { ActionType, HardhatRuntimeEnvironment } from 'hardhat/types'

import { DebugLogger } from '../common/utils'

interface DebugTaskArgs {
    contractName: string
}

const action: ActionType<DebugTaskArgs> = async ({ contractName }, hre: HardhatRuntimeEnvironment) => {
    const contract = await hre.ethers.getContract(contractName)
    const readableContract = contract as unknown as { data: () => Promise<string> }

    const storedData = await readableContract.data()

    DebugLogger.header('EVM OApp Store Information')
    DebugLogger.keyValue('Network', hre.network.name)
    DebugLogger.keyValue('Contract Name', contractName)
    DebugLogger.keyValue('Contract Address', contract.address)
    DebugLogger.keyValue('String', storedData)
    DebugLogger.separator()
}

task('lz:oapp:evm:debug', 'Reads the stored string data from the EVM OApp', action).addOptionalParam(
    'contractName',
    'Name of the deployed EVM OApp contract (default: MyOApp)',
    'MyOApp',
    types.string
)
