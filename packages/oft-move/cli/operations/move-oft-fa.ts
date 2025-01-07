import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'
import path from 'path'

import { initOFTFA } from '../../tasks/initOFTFA'

class InitOFTFA implements INewOperation {
    vm = 'move'
    operation = 'init'
    description = 'Initialize an OFT with FA'
    reqArgs = ['move_deploy_script']

    async impl(args: any): Promise<void> {
        const fullPathOFTConfig = path.resolve(path.join(args.rootDir, args.move_deploy_script))
        const oftConfig = await import(fullPathOFTConfig)

        const oftType = oftConfig.oftType
        const oftMetadata = oftConfig.oftMetadata
        if (!oftMetadata) {
            throw new Error(`${fullPathOFTConfig} does not contain an oftMetadata object`)
        }

        switch (oftType) {
            case 'OFT_FA':
                await initOFTFA(
                    oftMetadata.token_name,
                    oftMetadata.token_symbol,
                    oftMetadata.icon_uri,
                    oftMetadata.project_uri
                )
                break
            default:
                throw new Error(`Unsupported OFT type: ${oftType}`)
        }
    }
}

const NewOperation = new InitOFTFA()
export { NewOperation }
