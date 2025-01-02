import { AptosEVMCLI_Core } from '@layerzerolabs/devtools-movement/cli/AptosEVMCli'
import { initOFTFA } from '../tasks/initOFTFA'
import path from 'path'

class AptosEVMCLI extends AptosEVMCLI_Core {
    constructor() {
        super()
    }

    async cli() {
        await super.cli()

        if (this.args.op === 'init' || this.args.op === 'deploy') {
            const fullPathOFTConfig = path.resolve(path.join(this.rootDir, this.args.move_deploy_script))
            const oftConfig = await import(fullPathOFTConfig)

            const oftType = oftConfig.oftType
            const oftMetadata = oftConfig.oftMetadata
            if (!oftMetadata) {
                throw new Error(`${fullPathOFTConfig} does not contain an oftMetadata object`)
            }

            switch (oftType) {
                case 'OFT_FA':
                    await this.initOFTFA(oftMetadata)
                    break
                default:
                    throw new Error(`Unsupported OFT type: ${oftType}`)
            }
        }
    }

    async initOFTFA(oftMetadata: any) {
        await initOFTFA(oftMetadata.token_name, oftMetadata.token_symbol, oftMetadata.icon_uri, oftMetadata.project_uri)
    }
}

export { AptosEVMCLI }
