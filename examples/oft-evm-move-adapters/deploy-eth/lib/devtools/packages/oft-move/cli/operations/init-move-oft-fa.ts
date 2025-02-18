import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'
import path from 'path'

import { initOFTFA } from '../../tasks/initOFTFA'

class InitOFTFA implements INewOperation {
    vm = 'move'
    operation = 'init-fa'
    description = 'Initialize an OFT with FA'
    reqArgs = ['move_deploy_script', 'oapp_config']

    async impl(args: any): Promise<void> {
        const fullPathOFTConfig = path.resolve(path.join(args.rootDir, args.move_deploy_script))
        const oftConfig = await import(fullPathOFTConfig)

        const oftMetadata = oftConfig.oftMetadata
        if (!oftMetadata) {
            throw new Error(`${fullPathOFTConfig} does not contain an oftMetadata object`)
        }

        await initOFTFA(
            oftMetadata.token_name,
            oftMetadata.token_symbol,
            oftMetadata.icon_uri,
            oftMetadata.project_uri,
            oftMetadata.sharedDecimals,
            oftMetadata.localDecimals,
            args.oapp_config
        )
    }
}

const NewOperation = new InitOFTFA()
export { NewOperation }
