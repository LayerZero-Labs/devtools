import { sdk } from '@layerzerolabs/devtools-extensible-cli/cli/AptosEVMCli'
import { attach_wire_evm, attach_wire_move } from '@layerzerolabs/devtools-movement/cli/init'
import { attach_oft_move } from '@layerzerolabs/oft-movement/cli/init'

async function lzSdk() {
    await attach_wire_move(sdk)
    await attach_oft_move(sdk)
    await attach_wire_evm(sdk)

    await sdk.execute()
}

lzSdk()
