import { AptosEVMCLI } from '@layerzerolabs/devtools-extensible-cli/cli/AptosEVMCli'
import path from 'path'

export async function attach_wire_move(sdk: AptosEVMCLI) {
    await sdk.extendOperationFromPath(path.join(__dirname, './operations/move-build'))
    await sdk.extendOperationFromPath(path.join(__dirname, './operations/move-deploy'))
    await sdk.extendOperationFromPath(path.join(__dirname, './operations/move-wire'))
}

export async function attach_wire_evm(sdk: AptosEVMCLI) {
    await sdk.extendOperationFromPath(path.join(__dirname, './operations/evm-wire'))
}
