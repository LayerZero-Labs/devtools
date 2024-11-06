import { EndpointBasedFactory } from '@layerzerolabs/devtools'
import { RevertError } from '@layerzerolabs/devtools-evm'
import {
    Command,
    CommandRequest,
    Compute,
    ComputeEVM,
    ComputeType,
    ResolverType,
    SingleViewFunctionEVMCall,
} from '@layerzerolabs/lz-v2-utilities'

import {
    ContractNotFoundError,
    dedup,
    extractTimeMarker,
    findComputeResolvedTimeMarker,
    findRequestResolvedTimeMarker,
    isEqualTimeMarker,
    UnresolvableCommandError,
} from '@/read/common'
import type {
    BlockNumberTimeMarker,
    ICommandResolverSdk,
    IComputeEVMSdk,
    ISingleViewFunctionEVMCallSdk,
    ResolvedTimeMarker,
    ResolvedTimestampTimeMarker,
    TimeMarker,
    TimestampTimeMarker,
} from '@/read/types'

export class CommandResolverSdk implements ICommandResolverSdk {
    constructor(
        private options: {
            singleViewFunctionEVMCallSdkFactory: EndpointBasedFactory<ISingleViewFunctionEVMCallSdk>
            computeEVMSdkFactory: EndpointBasedFactory<IComputeEVMSdk>
        }
    ) {}

    public async extractTimeMarkers(cmd: string): Promise<{
        blockNumberTimeMarkers: BlockNumberTimeMarker[]
        timestampTimeMarkers: TimestampTimeMarker[]
    }> {
        const decodedCommand = Command.decode(cmd.replace('0x', ''))

        const timeMarkers: TimeMarker[] = []

        for (const request of decodedCommand.requests) {
            switch (request.requestHeader.resolverType) {
                case ResolverType.SingleViewFunctionEVMCall:
                    timeMarkers.push(extractTimeMarker(request as SingleViewFunctionEVMCall))
                    break
                default:
                    throw new Error(`Unsupported resolver type: ${request.requestHeader.resolverType}`)
            }
        }
        if (decodedCommand.compute) {
            switch (decodedCommand.compute.computeHeader.computeType) {
                case ComputeType.SingleViewFunctionEVMCall:
                    timeMarkers.push(extractTimeMarker(decodedCommand.compute as ComputeEVM))
                    break
                default:
                    throw new Error(`Unsupported compute type: ${decodedCommand.compute.computeHeader.computeType}`)
            }
        }

        const dedupedTimeMarkers = dedup(timeMarkers, isEqualTimeMarker)
        return {
            blockNumberTimeMarkers: dedupedTimeMarkers.filter((tm) => tm.isBlockNumber),
            timestampTimeMarkers: dedupedTimeMarkers.filter((tm) => !tm.isBlockNumber),
        }
    }

    public async resolveCmd(cmd: string, timeMarkers: ResolvedTimestampTimeMarker[]): Promise<string> {
        const decodedCommand = Command.decode(cmd.replace('0x', ''))

        try {
            const responses = await Promise.all(
                decodedCommand.requests.map(async (request) =>
                    this.resolveRequest(request, findRequestResolvedTimeMarker(request, timeMarkers))
                )
            )

            if (!decodedCommand.compute) {
                return responses.map((lr) => lr.response).join('')
            }

            return await this.resolveCompute(
                cmd,
                decodedCommand.compute,
                findComputeResolvedTimeMarker(decodedCommand.compute, timeMarkers),
                responses
            )
        } catch (error) {
            if (error instanceof ContractNotFoundError || error instanceof RevertError) {
                throw new UnresolvableCommandError()
            }
            throw error
        }
    }

    private async resolveRequest(
        request: CommandRequest,
        timeMarker: ResolvedTimeMarker
    ): Promise<{ request: string; response: string }> {
        switch (request.requestHeader.resolverType) {
            case ResolverType.SingleViewFunctionEVMCall: {
                const requestEvm = request as SingleViewFunctionEVMCall
                const response = await (
                    await this.options.singleViewFunctionEVMCallSdkFactory(requestEvm.targetEid)
                ).resolve(requestEvm, timeMarker)
                return { request: requestEvm.encode(), response }
            }
            default:
                throw new Error(`Unsupported resolver type: ${request.requestHeader.resolverType}`)
        }
    }

    private async resolveCompute(
        cmd: string,
        compute: Compute,
        timeMarker: ResolvedTimeMarker,
        responses: { request: string; response: string }[]
    ): Promise<string> {
        switch (compute.computeHeader.computeType) {
            case ComputeType.SingleViewFunctionEVMCall: {
                const computeEvm = compute as ComputeEVM
                return await (
                    await this.options.computeEVMSdkFactory(computeEvm.targetEid)
                ).resolve(cmd, computeEvm, timeMarker, responses)
            }
            default:
                throw new Error(`Unsupported compute type: ${compute.computeHeader.computeType}`)
        }
    }
}
