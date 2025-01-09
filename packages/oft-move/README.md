# Move CLI Reviewer Guide:

I'm putting together a guide of the CLI where I trace through running one of the commands and explain what files are doing to illustrate the general high level architecture of the CLI.

`examples/oft-move` is the example for deploying an OFT on aptos (and later movement).

Inisde of `examples/oft-move/` go into package.json. Here we have a list of the commands that we can run.

You can also run `pnpm run lz:sdk:help` inside of `examples/oft-move/` to see the list of commands.

For this high level overview, we will be drilling down into the wire command.

The wire command code is can be found in the `packages/devtools-move/tasks/move/wire.ts` file.

The wire command is defined in `packages/devtools-move/cli/operations/move-wire.ts`
`cli/operations/` is where we define all of the CLI operations that we want a user to be able to run.

Here is the code for the wire operation. As you can see it just defines what args are required, and passes those in to wireMove, where the actual logic is defined.
```ts
import { INewOperation } from '@layerzerolabs/devtools-extensible-cli'
import { wireMove } from '../../tasks/move/wire'

class MoveWireOperation implements INewOperation {
    vm = 'move' // This is the VM we are working with
    operation = 'wire' // This is the new name of the operation
    description = 'Wire Aptos Move contracts' // This is the description of the operation that is displayed when help is called
    reqArgs = ['lz_config'] // This is the list of args that are required for the operation for wire its just the lz_config path

    async impl(args: any): Promise<void> {
        await wireMove(args) // call the wireMove function with the args
    }
}

const NewOperation = new MoveWireOperation()
export { NewOperation }
```

The wire operation is registered in: `packages/devtools-move/cli/init.ts`
`init.ts` is the location that the CLI will look to find what operations are available.
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

The above two files are all that is required to register an operation.

Now we can move on to the wire command internals where we interface with the OFT SDK.

The wire command is defined in `packages/devtools-move/tasks/move/wire.ts`. `tasks/move/` is where we define scripts that interact with move VM.

There two main things we need to look at in the wire command, creating the wiring transactions and then sending the transactions.

The creation of transactions is defined in `packages/devtools-move/tasks/move/utils/moveVMOftConfigOps.ts`

This is the crux of the move VM side of this entire project. If there is any file to code review, this is the one.

Let's drill down on the function `createSetReceiveLibraryTxs`. The other functions all follow a similar pattern.
The pattern consists of three steps:

1. Check for no setting - verify if the configuration value exists in the config file
2. Get the current setting - retrieve the current value from the blockchain
3. Compare and act:
   - If the current value matches the config, print "already set" message
   - If different, print the diff and create a transaction to update the value
```ts
export async function createSetReceiveLibraryTimeoutTx(
    oft: OFT,
    endpoint: Endpoint,
    connection: OAppOmniGraphHardhat['connections'][number]
): Promise<TransactionPayload | null> {
    // 1. Check for no config setting
    if (!connection.config?.receiveLibraryTimeoutConfig) {
        printNotSet('Receive library timeout', connection)
        return null
    }
    // 2. Get the current setting
    const currentTimeout = await endpoint.getReceiveLibraryTimeout(oft.oft_address, connection.to.eid)
    const currentTimeoutAsBigInt = BigInt(currentTimeout.expiry)

    // 3. Compare and act
    if (currentTimeoutAsBigInt === BigInt(connection.config.receiveLibraryTimeoutConfig.expiry)) {
        printAlreadySet('Receive library timeout', connection)
        return null
    } else {
        let currTimeoutDisplay = '' + currentTimeoutAsBigInt
        if (currentTimeoutAsBigInt === BigInt(-1)) {
            currTimeoutDisplay = 'unset'
        }
        // Printing the diff
        const diffMessage = createDiffMessage(`receive library timeout`, connection)
        diffPrinter(
            diffMessage,
            { timeout: currTimeoutDisplay },
            { timeout: connection.config.receiveLibraryTimeoutConfig.expiry }
        )
        // Create the transaction
        const tx = oft.setReceiveLibraryTimeoutPayload(
            connection.to.eid,
            connection.config.receiveLibraryTimeoutConfig.lib,
            Number(connection.config.receiveLibraryTimeoutConfig.expiry)
        )
        // Return the transaction with the description and eid
        return {
            payload: tx,
            description: buildTransactionDescription('Set Receive Library Timeout', connection),
            eid: connection.to.eid,
        }
    }
}
```

The methods of `moveVMOftConfigOps.ts` call our MoveVM SDKs enpoint.ts, msgLib.ts, and oft.ts. These are all very simple and straightforward. The getters call blockchain view functions, but the setters return payloads to later be executed.

For example, the `setReceiveLibraryTimeoutPayload` method returns a payload to be executed on the MoveVM. It calls the `set_receive_library_timeout` function on the `oapp_core` module, at the address of the OFT, that is retrieved from `examples/oft-move/deployments/aptos-testnet/oft.json`.
```ts
setReceiveLibraryTimeoutPayload(
    remoteEid: number,
    msglibAddress: string,
    expiry: number
): InputGenerateTransactionPayloadData {
    return {
        function: `${this.oft_address}::oapp_core::set_receive_library_timeout`,
        functionArguments: [remoteEid, msglibAddress, expiry],
    }
}
```

After doing a similar process for all of the other config values, we now have a list of transactions in `wire.ts` and are ready to execute them.
```ts
const txs = await createWiringTxs(oft, moveVMEndpoint, connectionsFromMoveToAny)
await sendAllTxs(moveVMConnection, oft, account_address, txs)
```
Then in sendAllTxs, we loop through the transactions, and one by one submit and build them:
```ts
const trans = await aptos.transaction.build.simple({
    sender: account_address,
    data: cleanedPayloads[i].payload,
})
await oft.signSubmitAndWaitForTx(trans)
```

The output of wire looks like this:

```ts
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔄 Building wire transactions for pathway: aptos-testnet → bsc-testnet 🔄
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Set peer for pathway oft on aptos-testnet → bsc-testnet
 ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- 
 | Key                            | Current                                                                  | New                                                                      | 
 |--------------------------------|--------------------------------------------------------------------------|--------------------------------------------------------------------------| 
 | address                        |                                                                          | 0x000000000000000000000000ab88bad042336dcc4550182c12be17f0cc8bb7c5       | 
 ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------  

Set enforced options with message type: 1 for pathway oft on aptos-testnet → bsc-testnet
 ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- 
 | Key                            | Current                                                                  | New                                                                      | 
 |--------------------------------|--------------------------------------------------------------------------|--------------------------------------------------------------------------| 
 | LzReceiveOption.gas            |                                                                          | 80000                                                                    | 
 | LzReceiveOption.value          |                                                                          | 0                                                                        | 
 | NativeDropOption               | []                                                                       | []                                                                       | 
 | ComposeOption                  | []                                                                       | []                                                                       | 
 | LzReadOption.gas               |                                                                          |                                                                          | 
 | LzReadOption.dataSize          |                                                                          |                                                                          | 
 | LzReadOption.value             |                                                                          |                                                                          | 
 | OrderedExecutionOption         | false                                                                    | false                                                                    | 
 ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------  

Set enforced options with message type: 2 for pathway oft on aptos-testnet → bsc-testnet
 ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- 
 | Key                            | Current                                                                  | New                                                                      | 
 |--------------------------------|--------------------------------------------------------------------------|--------------------------------------------------------------------------| 
 | LzReceiveOption.gas            |                                                                          | 80000                                                                    | 
 | LzReceiveOption.value          |                                                                          | 0                                                                        | 
 | NativeDropOption               | []                                                                       | []                                                                       | 
 | ComposeOption                  | []                                                                       | []                                                                       | 
 | LzReadOption.gas               |                                                                          |                                                                          | 
 | LzReadOption.dataSize          |                                                                          |                                                                          | 
 | LzReadOption.value             |                                                                          |                                                                          | 
 | OrderedExecutionOption         | false                                                                    | false                                                                    | 
 ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------  

Set send library for pathway oft on aptos-testnet → bsc-testnet
 ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- 
 | Key                            | Current                                                                  | New                                                                      | 
 |--------------------------------|--------------------------------------------------------------------------|--------------------------------------------------------------------------| 
 | address                        | default: 0xbe533727aebe97132ec0a606d99e0ce137dbdf06286eb07d9e0f7154df1f3 | 0xbe533727aebe97132ec0a606d99e0ce137dbdf06286eb07d9e0f7154df1f3f10       | 
 |                                | f10                                                                      |                                                                          | 
 ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------  

Set receive library for pathway oft on aptos-testnet → bsc-testnet
 ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- 
 | Key                            | Current                                                                  | New                                                                      | 
 |--------------------------------|--------------------------------------------------------------------------|--------------------------------------------------------------------------| 
 | address                        | default: 0xbe533727aebe97132ec0a606d99e0ce137dbdf06286eb07d9e0f7154df1f3 | 0xbe533727aebe97132ec0a606d99e0ce137dbdf06286eb07d9e0f7154df1f3f10       | 
 |                                | f10                                                                      |                                                                          | 
 ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------  

Set receive library timeout for pathway oft on aptos-testnet → bsc-testnet
 ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- 
 | Key                            | Current                                                                  | New                                                                      | 
 |--------------------------------|--------------------------------------------------------------------------|--------------------------------------------------------------------------| 
 | timeout                        | unset                                                                    | 1000000000                                                               | 
 ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------  

Set send config for pathway oft on aptos-testnet → bsc-testnet
 ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- 
 | Key                            | Current                                                                  | New                                                                      | 
 |--------------------------------|--------------------------------------------------------------------------|--------------------------------------------------------------------------| 
 | confirmations                  | 260                                                                      | 260                                                                      | 
 | optional_dvn_threshold         | 0                                                                        | 0                                                                        | 
 | required_dvns[0]               | 0xd6f420483a90c7db5ce2ec12e8acfc2bfb7b93829c9e6a3b0760bca330be64dd       | 0xd6f420483a90c7db5ce2ec12e8acfc2bfb7b93829c9e6a3b0760bca330be64dd       | 
 | optional_dvns                  | []                                                                       | []                                                                       | 
 | use_default_for_confirmations  | false                                                                    | false                                                                    | 
 | use_default_for_required_dvns  | false                                                                    | false                                                                    | 
 | use_default_for_optional_dvns  | false                                                                    | true                                                                     | 
 ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------  

Set executor config for pathway oft on aptos-testnet → bsc-testnet
 ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- 
 | Key                            | Current                                                                  | New                                                                      | 
 |--------------------------------|--------------------------------------------------------------------------|--------------------------------------------------------------------------| 
 | max_message_size               | 10000                                                                    | 10000                                                                    | 
 | executor_address               | Default:0xeb514e8d337485dd9ce7492f70128ef5aaa8c34023866e261a24ffa3d61a68 | 0xeb514e8d337485dd9ce7492f70128ef5aaa8c34023866e261a24ffa3d61a686d       | 
 |                                | 6d                                                                       |                                                                          | 
 ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------  

Set receive config for pathway oft on aptos-testnet → bsc-testnet
 ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- 
 | Key                            | Current                                                                  | New                                                                      | 
 |--------------------------------|--------------------------------------------------------------------------|--------------------------------------------------------------------------| 
 | confirmations                  | 5                                                                        | 5                                                                        | 
 | optional_dvn_threshold         | 0                                                                        | 0                                                                        | 
 | required_dvns[0]               | 0xd6f420483a90c7db5ce2ec12e8acfc2bfb7b93829c9e6a3b0760bca330be64dd       | 0xd6f420483a90c7db5ce2ec12e8acfc2bfb7b93829c9e6a3b0760bca330be64dd       | 
 | optional_dvns                  | []                                                                       | []                                                                       | 
 | use_default_for_confirmations  | false                                                                    | false                                                                    | 
 | use_default_for_required_dvns  | false                                                                    | false                                                                    | 
 | use_default_for_optional_dvns  | false                                                                    | true                                                                     | 
 ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------  


Review the 12 transaction(s) above carefully.
Would you like to proceed with execution? (yes/no): y
y

📦 Transaction Summary:
   • Total transactions: 12
🔄 [1/12] Processing transaction 0: Set Peer from aptos-testnet → ethereum-testnet...
Transaction executed.
✅ [1/12] Transaction 0 completed

🔄 [2/12] Processing transaction 1: Set Enforced Options from aptos-testnet → ethereum-testnet...
Transaction executed.
✅ [2/12] Transaction 1 completed

🔄 [3/12] Processing transaction 2: Set Enforced Options from aptos-testnet → ethereum-testnet...
Transaction executed.
✅ [3/12] Transaction 2 completed

🔄 [4/12] Processing transaction 3: Set Peer from aptos-testnet → bsc-testnet...
Transaction executed.
✅ [4/12] Transaction 3 completed

🔄 [5/12] Processing transaction 4: Set Enforced Options from aptos-testnet → bsc-testnet...
Transaction executed.
✅ [5/12] Transaction 4 completed

🔄 [6/12] Processing transaction 5: Set Enforced Options from aptos-testnet → bsc-testnet...
Transaction executed.
✅ [6/12] Transaction 5 completed

🔄 [7/12] Processing transaction 6: Set Send Library from aptos-testnet → bsc-testnet...
Transaction executed.
✅ [7/12] Transaction 6 completed

🔄 [8/12] Processing transaction 7: Set Receive Library from aptos-testnet → bsc-testnet...
Transaction executed.
✅ [8/12] Transaction 7 completed

🔄 [9/12] Processing transaction 8: Set Receive Library Timeout from aptos-testnet → bsc-testnet...
Transaction executed.
✅ [9/12] Transaction 8 completed

🔄 [10/12] Processing transaction 9: Set Send Config from aptos-testnet → bsc-testnet...
Transaction executed.
✅ [10/12] Transaction 9 completed

🔄 [11/12] Processing transaction 10: setExecutorConfig from aptos-testnet → bsc-testnet...
Transaction executed.
✅ [11/12] Transaction 10 completed

🔄 [12/12] Processing transaction 11: Set Receive Config from aptos-testnet → bsc-testnet...
Transaction executed.
✅ [12/12] Transaction 11 completed

🎉 Transaction Summary:
   • 12 transactions processed successfully
🔌 Running second Move-VM wire...
```