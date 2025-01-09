# Move CLI Reviewer Guide:

I'm putting together a guide of the CLI where I trace through running one of the commands and explain what files are doing to illustrate the general high level architecture of the CLI.

We will use examples/oft-move/ as an example.

oft-move is the example for deploying an OFT on aptos (and later movement).

Inisde of examples/oft-move/ go into package.json. Here we have a list of the commands that we can run.

You can also run `pnpm run lz:sdk:help` inside of examples/oft-move/ to see the list of commands.

You output will look like this:
import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'
import { wireEvm } from '../../tasks/evm/wire-evm'

class EVMWireOperation implements INewOperation {
    vm = 'evm'
    operation = 'wire'
    description = 'Wire EVM contracts'
    reqArgs = ['lz_config']

    async impl(args: any): Promise<void> {
        await wireEvm(args)
    }
}

const NewOperation = new EVMWireOperation()
export { NewOperation }


We will be drilling down into the wire command.

The wire command code is can be found in the `devtools/packages/devtools-move/tasks/move/wire.ts` file.

The wire command is defined in `devtools-move/cli/operations/move-wire.ts`
`cli/operations/` is where we define all of the CLI operations that we want a user to be able to run.

Here is the code for the wire operation. As you can see it just defines what args are required, and passes those in to wireMove, where the actual logic is defined.
```ts
import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'
import { wireMove } from '../../tasks/move/wire'

class MoveWireOperation implements INewOperation {
    vm = 'move'
    operation = 'wire'
    description = 'Wire Aptos Move contracts'
    reqArgs = ['lz_config']

    async impl(args: any): Promise<void> {
        await wireMove(args)
    }
}

const NewOperation = new MoveWireOperation()
export { NewOperation }
```

The wire operation is registered in: `/devtools/packages/devtools-move/cli/init.ts`
It is simply the location that the CLI will look to find what operations are available.

```ts
import { AptosEVMCLI } from '@layerzerolabs/devtools-extensible-cli/cli/AptosEVMCli'
import path from 'path'

export async function attach_wire_move(sdk: AptosEVMCLI) {
    await sdk.extendOperationFromPath(path.join(__dirname, './operations/move-build'))
    await sdk.extendOperationFromPath(path.join(__dirname, './operations/move-deploy'))
    await sdk.extendOperationFromPath(path.join(__dirname, './operations/move-wire')) // Here is the wire operation
    await sdk.extendOperationFromPath(path.join(__dirname, './operations/move-set-delegate'))
}

export async function attach_wire_evm(sdk: AptosEVMCLI) {
    await sdk.extendOperationFromPath(path.join(__dirname, './operations/evm-wire'))
}
```

That is all there is to the high level architecture of the extensible CLI.

Now we can move on to the wire command internals where we interface with the OFT SDK.

The wire command is defined in `devtools-move/tasks/move/wire.ts`

There two main things we need to look at in the wire commands are creating the wiring transactions and then sending them.

The creation of transactions is defined in `devtools-move/tasks/move/utils/moveVMOftConfigOps.ts`

This is the crux of the this entire project. If there is any file to code review, this is the one.

Let's check out:
```ts
export async function createSetReceiveLibraryTxs(
    oft: OFT,
    endpoint: Endpoint,
    connections: OAppOmniGraphHardhat['connections']
): Promise<TransactionPayload[]> {
    const txs = []
    for (const entry of connections) {
        if (!entry.config?.receiveLibraryConfig?.receiveLibrary) {
            printNotSet('Receive library', entry)
            continue
        }
        const currentReceiveLibrary = await endpoint.getReceiveLibrary(oft.oft_address, entry.to.eid)
        let currentReceiveLibraryAddress = currentReceiveLibrary[0]
        const isFallbackToDefault = currentReceiveLibrary[1]

        // if unset, fallbackToDefault will be true and the receive library should be set regardless of the current value
        if (currentReceiveLibraryAddress === entry.config.receiveLibraryConfig.receiveLibrary && !isFallbackToDefault) {
            printAlreadySet('Receive library', entry)
            continue
        } else {
            if (isFallbackToDefault) {
                currentReceiveLibraryAddress = 'default: ' + currentReceiveLibraryAddress
            }
            const diffMessage = createDiffMessage('receive library', entry)
            diffPrinter(
                diffMessage,
                { address: currentReceiveLibraryAddress },
                { address: entry.config.receiveLibraryConfig.receiveLibrary }
            )
            const tx = await oft.setReceiveLibraryPayload(
                entry.to.eid,
                entry.config.receiveLibraryConfig.receiveLibrary,
                Number(entry.config.receiveLibraryConfig.gracePeriod || 0)
            )
            txs.push({
                payload: tx,
                description: buildTransactionDescription('Set Receive Library', entry),
                eid: entry.to.eid,
            })
        }
    }

    return txs
}
```

The functions all follow a similar patter, loop throuhg the connections from the config where the connections are MoveVM (such as aptos -> All Chains).
Then for each connection we see if the user actually set the value in the config. If not we stop.

Then we retrieve from the blockchain the current value of the config. If it's different, we print the difference, and create a transaction to set the value.

The methods of `moveVMOftConfigOps.ts` call our MoveVM SDKs enpoint.ts, msgLib.ts, and oft.ts. These are all very simple and straightforward. The getters call blockchain view functions, but the setters return payloads to later be executed.


Now we can go back to `wire.ts` and see how the transactions are created.

```ts
const txs = await createWiringTxs(oft, moveVMEndpoint, connectionsFromMoveToAny)
await sendAllTxs(moveVMConnection, oft, account_address, txs)
```

The design is to accumulate all of the transactions, into a single array, and then give the user the option to read over the diffs and approve the execution. For a specific transaction, if there is no diff we will have printed a message (back in `moveVMOftConfigOps.ts`) saying that the config is already set.
