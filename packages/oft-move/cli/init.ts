import { AptosEVMCLI } from '@layerzerolabs/devtools-extensible-cli'

import {
    InitMoveOFTFA,
    InitMoveOFTFAAdapter,
    InitMoveOFTCoinAdapter,
    MoveOFTAdapterDisableBlocklist,
    MoveOFTAdapterSetFee,
    MoveOFTAdapterSetRateLimit,
    MoveOFTAdapterUnsetRateLimit,
    MoveOFTDisableBlocklist,
    MoveOFTDisableFreezing,
    MoveOFTSetFee,
    MoveOFTSetRateLimit,
    MoveOFTRateLimit,
    MintToMoveOFT,
    QuoteSendMoveOFT,
    SendFromMoveOFT,
} from './operations'

export async function attach_oft_move(sdk: AptosEVMCLI) {
    await sdk.extendOperation(InitMoveOFTFA)
    await sdk.extendOperation(InitMoveOFTFAAdapter)
    await sdk.extendOperation(InitMoveOFTCoinAdapter)
    await sdk.extendOperation(MoveOFTAdapterDisableBlocklist)
    await sdk.extendOperation(MoveOFTAdapterSetFee)
    await sdk.extendOperation(MoveOFTAdapterSetRateLimit)
    await sdk.extendOperation(MoveOFTAdapterUnsetRateLimit)
    await sdk.extendOperation(MoveOFTDisableBlocklist)
    await sdk.extendOperation(MoveOFTDisableFreezing)
    await sdk.extendOperation(MoveOFTSetFee)
    await sdk.extendOperation(MoveOFTSetRateLimit)
    await sdk.extendOperation(MoveOFTRateLimit)
    await sdk.extendOperation(MintToMoveOFT)
    await sdk.extendOperation(QuoteSendMoveOFT)
    await sdk.extendOperation(SendFromMoveOFT)
}
