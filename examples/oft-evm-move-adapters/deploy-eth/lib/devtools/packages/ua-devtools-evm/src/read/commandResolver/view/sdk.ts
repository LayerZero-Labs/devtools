import {
    type ISingleViewFunctionCallerEVM,
    ResolvedTimeMarker,
    UnresolvableCommandError,
} from '@layerzerolabs/ua-devtools'
import { SingleViewFunctionEVMCall } from '@layerzerolabs/lz-v2-utilities'

import { ContractNotFoundError, EVMViewFunctionBase } from '@/read'
import { RevertError } from '@layerzerolabs/devtools-evm'

export class SingleViewFunctionCallerEVM extends EVMViewFunctionBase implements ISingleViewFunctionCallerEVM {
    public async resolve(request: SingleViewFunctionEVMCall, timeMarker: ResolvedTimeMarker): Promise<string> {
        try {
            return await this.callContract('0x' + request.calldata, request.to, timeMarker.blockNumber)
        } catch (error) {
            if (error instanceof ContractNotFoundError || error instanceof RevertError) {
                this.logger.error(`Error on resolving request section of command: ${error}`)
                throw new UnresolvableCommandError()
            }
            throw error
        }
    }
}
