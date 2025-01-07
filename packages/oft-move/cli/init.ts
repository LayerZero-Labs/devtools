import { AptosEVMCLI } from '@layerzerolabs/devtools-extensible-cli/cli/AptosEVMCli'
import path from 'path'

export async function attach_oft_move(sdk: AptosEVMCLI) {
    await sdk.extendOperationFromPath(path.join(__dirname, './operations/move-oft-fa'))
    await sdk.extendOperationFromPath(path.join(__dirname, './operations/quoteSendOFTFA'))
}
