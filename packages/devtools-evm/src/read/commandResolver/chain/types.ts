import type { ComputeEVM, SingleViewFunctionEVMCall } from '@layerzerolabs/lz-v2-utilities'

import type { ResolvedTimeMarker } from '@/read/types'

export interface ISingleViewFunctionEVMCallSdk {
    resolve(request: SingleViewFunctionEVMCall, timeMarker: ResolvedTimeMarker): Promise<string>
}

export interface IComputeEVMSdk {
    resolve(
        cmd: string,
        compute: ComputeEVM,
        timeMarker: ResolvedTimeMarker,
        responses: {
            request: string
            response: string
        }[]
    ): Promise<string>
}

export interface RequestResponsePair {
    request: string
    response: string
}
