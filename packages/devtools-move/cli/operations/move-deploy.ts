import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'
import path from 'path'

import { build as buildMove } from '../../tasks/move/build'
import { deploy as deployMove } from '../../tasks/move/deploy'
import { setDelegate } from '../../tasks/move/setDelegate'

class MoveDeployOperation implements INewOperation {
    vm = 'move'
    operation = 'deploy'
    description = 'Deploy Aptos Move contracts'
    reqArgs = ['lz_config', 'named_addresses', 'move_deploy_script']

    async impl(args: any): Promise<void> {
        const aptosDeployScript = await import(path.join(args.rootDir, args.move_deploy_script))
        await buildMove(args)
        await deployMove(args, aptosDeployScript.contractName)
        await setDelegate(args, true)
    }
}

const NewOperation = new MoveDeployOperation()
export { NewOperation }
