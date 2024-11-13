import {
    type ISingleViewFunctionCallerEVM,
    ResolvedTimeMarker,
    UnresolvableCommandError,
} from '@layerzerolabs/devtools'
import { SingleViewFunctionEVMCall } from '@layerzerolabs/lz-v2-utilities'

import { ContractNotFoundError, EVMViewFunctionBase } from '@/read'
import { RevertError } from '@/errors'

export class SingleViewFunctionCallerEVM extends EVMViewFunctionBase implements ISingleViewFunctionCallerEVM {
    public async resolve(request: SingleViewFunctionEVMCall, timeMarker: ResolvedTimeMarker): Promise<string> {
        try {
            return await this.callContract('0x' + request.calldata, request.to, timeMarker.blockNumber)
        } catch (error) {
            if (error instanceof ContractNotFoundError || error instanceof RevertError) {
                throw new UnresolvableCommandError()
            }
            throw error
        }
    }
}
