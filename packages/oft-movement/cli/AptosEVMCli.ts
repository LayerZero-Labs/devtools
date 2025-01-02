import { AptosEVMCLI_Core } from '@layerzerolabs/devtools-movement/cli/AptosEVMCli'
import { initOFTFA } from '../tasks/initOFTFA'
import path from 'path'

class AptosEVMCLI extends AptosEVMCLI_Core {
    constructor() {
        super()
    }

    async cli() {
        await super.cli()

        if (this.args.op === 'initOFTFA' || this.args.op === 'deploy') {
            await this.initOFTFA(this.args.move_deploy_script)
        }
    }

    async initOFTFA(move_deploy_script: string, rootDir: string = process.cwd()) {
        const fullPathOFTConfig = path.resolve(path.join(rootDir, move_deploy_script))
        const oftConfig = await import(fullPathOFTConfig)
        const oftMetadata = oftConfig.oftMetadata

        if (!oftMetadata) {
            throw new Error(`${fullPathOFTConfig} does not contain an oftMetadata object`)
        }

        await initOFTFA(oftMetadata.token_name, oftMetadata.token_symbol, oftMetadata.icon_uri, oftMetadata.project_uri)
    }
}

export { AptosEVMCLI }
