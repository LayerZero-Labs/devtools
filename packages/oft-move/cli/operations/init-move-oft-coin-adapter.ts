import { INewOperation } from '@layerzerolabs/devtools-extensible-cli/cli/types/NewOperation'

import { initializeTaskContext } from '@layerzerolabs/devtools-move'
import { initOFTAdapterCoin } from '@/tasks/initOFTAdapterCoin'

class InitOFTAdapterCoin implements INewOperation {
    vm = 'move'
    operation = 'init-coin-adapter'
    description = 'Initialize an OFT Adapter with Coin'
    reqArgs = ['move_deploy_script', 'oapp_config']

    async impl(args: any): Promise<void> {
        const taskContext = await initializeTaskContext(args.oapp_config)
        await initOFTAdapterCoin(taskContext)
    }
}

const NewOperation = new InitOFTAdapterCoin()
export { NewOperation }
