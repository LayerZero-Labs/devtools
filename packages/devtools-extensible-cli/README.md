# Devtools-Extensible-CLI README

This is a CLI for LayerZero Devtools - which is extensible by defining new operations.

Operations are of the class Type `INewOperation` and are defined in the `types/index.d.ts` file.

When you go to type your new operation, the args will have `-` instead of `_`.
For example, `lz_config` will be `--lz-config` on the command line.

```ts
import { build as buildMove } from '../../tasks/move/build'
import { INewOperation } from './NewOperation'

class MoveBuildOperation implements INewOperation {
    // the vm to use
    vm = 'move'
    // the name of this operation
    operation = 'build'
    // the required arguments for the operation
    reqArgs = ['lz_config', 'named_addresses', 'move_deploy_script']
    // arguments that you want to create in addition to the pre-defined ones
    addArgs = []

    // the implementation of the operation
    async impl(args: any): Promise<void> {
        await buildMove(args)
    }
}

const NewOperation = new MoveBuildOperation()
export { NewOperation }
```

You can attach new operations to this via 
1. Paths `await sdk.extendOperationFromPath('./operations/move-build')` - example: `packages/devtools-movement/operations/init.ts`
2. Providing an implementation of the `INewOperation` interface `await sdk.extendOperation(NewOperation)` - example: `examples/oft-movement/scripts/cli.ts`
