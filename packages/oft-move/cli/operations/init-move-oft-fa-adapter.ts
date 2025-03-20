import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'
import { importDefault } from '@layerzerolabs/io-devtools'
import path from 'path'

import { initOFTAdapterFA } from '../../tasks/initOFTAdapterFA'
import { initializeTaskContext } from '@layerzerolabs/devtools-move'
import { OFTAdapterFaInitParams } from '../../types'

class InitOFTFAAdapter implements INewOperation {
    vm = 'move'
    operation = 'init-fa-adapter'
    description = 'Initialize an OFT Adapter with FA'
    reqArgs = ['move_deploy_script', 'oapp_config']

    async impl(args: any): Promise<void> {
        const fullPathOFTConfig = path.resolve(path.join(args.rootDir, args.move_deploy_script))
        const oftMetadata = (await importDefault(fullPathOFTConfig)) as OFTAdapterFaInitParams

        if (!oftMetadata) {
            throw new Error(`${fullPathOFTConfig} does not contain an oftMetadata object`)
        }

        const taskContext = await initializeTaskContext(args.oapp_config)

        await initOFTAdapterFA(taskContext, oftMetadata.move_vm_fa_address)
    }
}

const NewOperation = new InitOFTFAAdapter()
export { NewOperation }
