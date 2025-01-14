import { AptosEVMCLI } from '@layerzerolabs/devtools-extensible-cli/cli/AptosEVMCli'
import path from 'path'

export async function attach_wire_move(sdk: AptosEVMCLI) {
    await sdk.extendOperationFromPath(path.join(__dirname, './operations/move-build'))
    await sdk.extendOperationFromPath(path.join(__dirname, './operations/move-deploy'))
    await sdk.extendOperationFromPath(path.join(__dirname, './operations/move-wire'))
    await sdk.extendOperationFromPath(path.join(__dirname, './operations/move-set-delegate'))
    await sdk.extendOperationFromPath(path.join(__dirname, './operations/transfer-oapp-owner'))
    await sdk.extendOperationFromPath(path.join(__dirname, './operations/transfer-object-owner'))
}

export async function attach_wire_evm(sdk: AptosEVMCLI) {
    await sdk.extendOperationFromPath(path.join(__dirname, './operations/evm-wire'))
    await sdk.extendOperationFromPath(path.join(__dirname, './operations/evm-quote-send'))
    await sdk.extendOperationFromPath(path.join(__dirname, './operations/evm-send'))
}
