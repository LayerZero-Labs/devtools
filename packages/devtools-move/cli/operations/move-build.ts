import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'
// import { build as buildMove } from '../../tasks/move/build'

class MoveBuildOperation implements INewOperation {
    vm = 'move'
    operation = 'build'
    description = 'Build Aptos Move contracts'
    reqArgs = ['oapp_config', 'named_addresses']

    addArgs = [
        {
            name: '--chain',
            arg: {
                help: 'The chain to build the contracts for',
                required: false,
            },
        },
    ]

    async impl(args: any): Promise<void> {
        console.log(args)
        // await buildMove(args)
    }
}

const NewOperation = new MoveBuildOperation()
export { NewOperation }
