import { ActionType } from 'hardhat/types'
import { task } from 'hardhat/config'

interface TaskArgs {
    oappConfig: string
}

const setOAppConfig: ActionType<TaskArgs> = async ({ oappConfig: oappConfigPath }) => {
    // TODO checks for valid config file
    // TODO call configureOApp
    console.log(oappConfigPath)
    return []
}

task(
    'TASK_LZ_SET_OAPP_CONFIG',
    'outputs the default Send and Receive Messaging Library versions and the default application config'
)
    .addParam('networks', 'comma separated list of networks')
    .addParam('addresses', 'comma separated list of addresses')
    .setAction(setOAppConfig)
