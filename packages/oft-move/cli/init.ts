import { AptosEVMCLI } from '@layerzerolabs/devtools-extensible-cli/cli/AptosEVMCli'
import path from 'path'

export async function attach_oft_move(sdk: AptosEVMCLI) {
    await sdk.extendOperationFromPath(path.join(__dirname, './operations/init-move-oft-fa'))
    await sdk.extendOperationFromPath(path.join(__dirname, './operations/quote-send-move-oft'))
    await sdk.extendOperationFromPath(path.join(__dirname, './operations/init-move-oft-fa-adapter'))
    await sdk.extendOperationFromPath(path.join(__dirname, './operations/move-oft-set-fee'))
    await sdk.extendOperationFromPath(path.join(__dirname, './operations/move-oft-set-rate-limit'))
    await sdk.extendOperationFromPath(path.join(__dirname, './operations/move-oft-unset-rate-limit'))
    await sdk.extendOperationFromPath(path.join(__dirname, './operations/move-oft-disable-blocklist'))
    await sdk.extendOperationFromPath(path.join(__dirname, './operations/move-oft-disable-freezing'))
    await sdk.extendOperationFromPath(path.join(__dirname, './operations/send-from-move-oft'))
    await sdk.extendOperationFromPath(path.join(__dirname, './operations/mint-to-move-oft'))
}
