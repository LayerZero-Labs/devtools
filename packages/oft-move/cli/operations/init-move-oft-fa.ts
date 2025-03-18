import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'
import { importDefault } from '@layerzerolabs/io-devtools'
import path from 'path'

import { initOFTFA } from '../../tasks/initOFTFA'
import { initializeTaskContext } from '@layerzerolabs/devtools-move'
import { OFTFaInitParams } from '../../types/OFTFAInitParams'

class InitOFTFA implements INewOperation {
    vm = 'move'
    operation = 'init-fa'
    description = 'Initialize an OFT with FA'
    reqArgs = ['move_deploy_script', 'oapp_config']

    async impl(args: any): Promise<void> {
        const fullPathOFTConfig = path.resolve(path.join(args.rootDir, args.move_deploy_script))
        const oftMetadata = (await importDefault(fullPathOFTConfig)) as OFTFaInitParams

        if (!oftMetadata) {
            throw new Error(`${fullPathOFTConfig} does not contain an oftMetadata object`)
        }

        const taskContext = await initializeTaskContext(args.oapp_config)

        await initOFTFA(
            oftMetadata.token_name,
            oftMetadata.token_symbol,
            oftMetadata.icon_uri,
            oftMetadata.project_uri,
            oftMetadata.sharedDecimals,
            oftMetadata.localDecimals,
            taskContext
        )
    }
}

const NewOperation = new InitOFTFA()
export { NewOperation }
