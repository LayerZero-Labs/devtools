import { ActionType } from 'hardhat/types'
import { task } from 'hardhat/config'
import 'hardhat-deploy-ethers/internal/type-extensions'
import { getConfig } from '@/tasks/getConfig'

interface TaskArgs {
    networks: string
}

export const getDefaultConfig: ActionType<TaskArgs> = async (taskArgs) => {
    // @ts-ignore
    return getConfig(taskArgs)
}

task(
    'getDefaultConfig',
    'outputs the default Send and Receive Messaging Library versions and the default application config'
)
    .addParam('networks', 'comma separated list of networks')
    .setAction(getDefaultConfig)
