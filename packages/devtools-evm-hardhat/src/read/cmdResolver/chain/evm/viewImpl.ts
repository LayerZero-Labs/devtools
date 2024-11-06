import { SingleViewFunctionEVMCall } from '@layerzerolabs/lz-v2-utilities'

import { EVMViewFunctionBase } from '@/read/cmdResolver/chain/evm/base'
import type { ISingleViewFunctionEVMCallSdk, ResolvedTimeMarker } from '@/read/types'

export class SingleViewFunctionEVMCallImplSdk extends EVMViewFunctionBase implements ISingleViewFunctionEVMCallSdk {
    public async resolve(request: SingleViewFunctionEVMCall, timeMarker: ResolvedTimeMarker): Promise<string> {
        return await this.callContract('0x' + request.calldata, request.to, timeMarker.blockNumber)
    }
}
