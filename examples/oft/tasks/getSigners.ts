import { task, types } from 'hardhat/config'
import { type ActionType } from 'hardhat/types'

// TODO Figure out a way so this doesnt need to be defined in two places
interface TaskArguments {
    n: number
}

const action: ActionType<TaskArguments> = async (taskArgs, hre) => {
    const signers = await hre.ethers.getSigners()
    for (let i = 0; i < taskArgs.n; ++i) {
        console.log(`${i}) ${signers[i].address}`)
    }
}

task('getSigners', 'show the signers of the current mnemonic', action).addOptionalParam(
    'n',
    'how many to show',
    3,
    types.int
)
