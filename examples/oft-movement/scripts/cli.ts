import { sdk } from '@layerzerolabs/devtools-extensible-cli/cli/AptosEVMCli'
import { init_evm, init_move } from '@layerzerolabs/devtools-movement/cli/init'
import { oft_move } from '@layerzerolabs/oft-movement/cli/init'

async function lzSdk() {
    await init_move(sdk)
    await init_evm(sdk)
    await oft_move(sdk)

    await sdk.execute()
}

lzSdk()
