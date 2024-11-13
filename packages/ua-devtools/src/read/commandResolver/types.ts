import type {
    BlockNumberTimeMarker,
    ResolvedTimeMarker,
    ResolvedTimestampTimeMarker,
    TimestampTimeMarker,
} from '@/read/types'
import type { Command, ComputeEVM, SingleViewFunctionEVMCall } from '@layerzerolabs/lz-v2-utilities'

export interface ICommandResolver {
    decodeCommand(command: string): Command

    extractTimeMarkers(command: string): Promise<{
        blockNumberTimeMarkers: BlockNumberTimeMarker[]
        timestampTimeMarkers: TimestampTimeMarker[]
    }>

    resolveCommand(command: string, timeMarkers: ResolvedTimestampTimeMarker[]): Promise<string>
}

export interface RequestResponsePair {
    request: string
    response: string
}

export interface IComputerEVM {
    resolve(
        cmd: string,
        compute: ComputeEVM,
        timeMarker: ResolvedTimeMarker,
        responses: RequestResponsePair[]
    ): Promise<string>
}

export interface ISingleViewFunctionCallerEVM {
    resolve(request: SingleViewFunctionEVMCall, timeMarker: ResolvedTimeMarker): Promise<string>
}
