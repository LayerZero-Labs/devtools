import { sdk } from '@layerzerolabs/devtools-extensible-cli'
import { attach_wire_evm, attach_wire_move } from '@layerzerolabs/devtools-move'
import { attach_oft_move } from '@layerzerolabs/oft-move'

async function lzSdk() {
    await attach_wire_move(sdk)
    await attach_oft_move(sdk)
    await attach_wire_evm(sdk)

    await sdk.execute()
}

lzSdk()
