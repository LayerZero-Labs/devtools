import { AptosEVMCLI } from '@layerzerolabs/devtools-extensible-cli/cli/AptosEVMCli'
import path from 'path'

export async function attach_oft_move(sdk: AptosEVMCLI) {
    await sdk.extendOperationFromPath(path.join(__dirname, './operations/init-move-oft-fa'))
    await sdk.extendOperationFromPath(path.join(__dirname, './operations/quote-send-move-oft'))
    await sdk.extendOperationFromPath(path.join(__dirname, './operations/init-move-oft-fa-adapter'))
    await sdk.extendOperationFromPath(path.join(__dirname, './operations/quote-send-oft-fa'))
}
