import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'
import path from 'path'

import { initOFTAdapterFA } from '../../tasks/initOFTAdapterFA'

class InitOFTFAAdapter implements INewOperation {
    vm = 'move'
    operation = 'init-fa-adapter'
    description = 'Initialize an OFT Adapter with FA'
    reqArgs = ['move_deploy_script', 'oapp_config']

    async impl(args: any): Promise<void> {
        const fullPathOFTConfig = path.resolve(path.join(args.rootDir, args.move_deploy_script))
        const oftConfig = await import(fullPathOFTConfig)

        const oftMetadata = oftConfig.oftMetadata
        if (!oftMetadata) {
            throw new Error(`${fullPathOFTConfig} does not contain an oftMetadata object`)
        }

        await initOFTAdapterFA(args.oapp_config, oftMetadata.move_vm_fa_address, oftMetadata.shared_decimals)
    }
}

const NewOperation = new InitOFTFAAdapter()
export { NewOperation }
