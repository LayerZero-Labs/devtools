import { IOwnable } from '@layerzerolabs/ua-devtools'

import type { IOmniSDK, OmniAddress, OmniPoint, OmniSDKFactory, OmniTransaction } from '@layerzerolabs/devtools'

export type ERC20Factory<TERC20 extends IERC20 = IERC20, TOmniPoint = OmniPoint> = OmniSDKFactory<TERC20, TOmniPoint>

export interface IERC20 extends IOmniSDK, IOwnable {
    getDecimals(): Promise<number>
    getName(): Promise<string>
    getSymbol(): Promise<string>
    getBalanceOf(user: OmniAddress): Promise<bigint>
    getAllowance(owner: OmniAddress, spender: OmniAddress): Promise<bigint>

    approve(spender: OmniAddress, amount: bigint): Promise<OmniTransaction>
    mint(spender: OmniAddress, amount: bigint): Promise<OmniTransaction>
}
