import { AptosEVMCLI } from '@layerzerolabs/devtools-extensible-cli/cli/AptosEVMCli'
import { NewOperation as MoveBuildOperation } from './operations/move-build'
import { NewOperation as MoveDeployOperation } from './operations/move-deploy'
import { NewOperation as MoveWireOperation } from './operations/move-wire'
import { NewOperation as MoveSetDelegateOperation } from './operations/move-set-delegate'
import { NewOperation as MoveTransferOAppOwnerOperation } from './operations/transfer-oapp-owner'
import { NewOperation as MoveTransferObjectOwnerOperation } from './operations/transfer-object-owner'
import { NewOperation as EVMWireOperation } from './operations/evm-wire'
import { NewOperation as EVMQuoteSendOperation } from './operations/evm-quote-send'
import { NewOperation as EVMSendOperation } from './operations/evm-send'
import { NewOperation as EVMTransactionParserOperation } from './operations/evm-transaction-parser'

export async function attach_wire_move(sdk: AptosEVMCLI) {
    await sdk.extendOperation(MoveBuildOperation)
    await sdk.extendOperation(MoveDeployOperation)
    await sdk.extendOperation(MoveWireOperation)
    await sdk.extendOperation(MoveSetDelegateOperation)
    await sdk.extendOperation(MoveTransferOAppOwnerOperation)
    await sdk.extendOperation(MoveTransferObjectOwnerOperation)
}

export async function attach_wire_evm(sdk: AptosEVMCLI) {
    await sdk.extendOperation(EVMWireOperation)
    await sdk.extendOperation(EVMQuoteSendOperation)
    await sdk.extendOperation(EVMSendOperation)
    await sdk.extendOperation(EVMTransactionParserOperation)
}
