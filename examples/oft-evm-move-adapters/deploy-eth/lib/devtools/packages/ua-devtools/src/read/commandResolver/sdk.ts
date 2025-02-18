import { EndpointBasedFactory } from '@layerzerolabs/devtools'
import { createModuleLogger, Logger } from '@layerzerolabs/io-devtools'
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
    type BlockNumberTimeMarker,
    dedupTimeMarkers,
    extractTimeMarker,
    findComputeResolvedTimeMarker,
    findRequestResolvedTimeMarker,
    type ResolvedTimeMarker,
    type ResolvedTimestampTimeMarker,
    type TimeMarker,
    type TimestampTimeMarker,
} from '@/read'

import type { ICommandResolver, RequestResponsePair, IComputerEVM, ISingleViewFunctionCallerEVM } from './types'

export class CommandResolver implements ICommandResolver {
    constructor(
        protected readonly singleViewFunctionEVMCallFactory: EndpointBasedFactory<ISingleViewFunctionCallerEVM>,
        protected readonly computerEVMFactory: EndpointBasedFactory<IComputerEVM>
    ) {}

    public decodeCommand(command: string): Command {
        return Command.decode(command.replace('0x', ''))
    }

    public async extractTimeMarkers(command: string): Promise<{
        blockNumberTimeMarkers: BlockNumberTimeMarker[]
        timestampTimeMarkers: TimestampTimeMarker[]
    }> {
        const decodedCommand = Command.decode(command.replace('0x', ''))

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

        const dedupedTimeMarkers = dedupTimeMarkers(timeMarkers)
        return {
            blockNumberTimeMarkers: dedupedTimeMarkers.filter((tm) => tm.isBlockNumber),
            timestampTimeMarkers: dedupedTimeMarkers.filter((tm) => !tm.isBlockNumber),
        }
    }

    public async resolveCommand(command: string, timeMarkers: ResolvedTimestampTimeMarker[]): Promise<string> {
        const logger = createModuleLogger('CommandResolverSdk')
        const decodedCommand = Command.decode(command.replace('0x', ''))

        logger.info(`Resolving requests`)
        const responses = await Promise.all(
            decodedCommand.requests.map(async (request) =>
                this.resolveRequest(request, findRequestResolvedTimeMarker(request, timeMarkers), logger)
            )
        )

        if (!decodedCommand.compute) {
            logger.info('No compute information in command, returning concatenated responses')
            return responses.map((lr) => lr.response).join('')
        }

        return await this.resolveCompute(
            command,
            decodedCommand.compute,
            findComputeResolvedTimeMarker(decodedCommand.compute, timeMarkers),
            responses
        )
    }

    private async resolveRequest(
        request: CommandRequest,
        timeMarker: ResolvedTimeMarker,
        logger: Logger
    ): Promise<RequestResponsePair> {
        switch (request.requestHeader.resolverType) {
            case ResolverType.SingleViewFunctionEVMCall: {
                const requestEvm = request as SingleViewFunctionEVMCall
                const response = await (
                    await this.singleViewFunctionEVMCallFactory(requestEvm.targetEid)
                ).resolve(requestEvm, timeMarker)
                logger.debug(`Resolved request ${requestEvm.encode()}: ${response}`)
                return { request: requestEvm.encode(), response }
            }
            default:
                throw new Error(`Unsupported resolver type: ${request.requestHeader.resolverType}`)
        }
    }

    private async resolveCompute(
        command: string,
        compute: Compute,
        timeMarker: ResolvedTimeMarker,
        responses: RequestResponsePair[]
    ): Promise<string> {
        switch (compute.computeHeader.computeType) {
            case ComputeType.SingleViewFunctionEVMCall: {
                const computeEvm = compute as ComputeEVM
                return await (
                    await this.computerEVMFactory(computeEvm.targetEid)
                ).resolve(command, computeEvm, timeMarker, responses)
            }
            default:
                throw new Error(`Unsupported compute type: ${compute.computeHeader.computeType}`)
        }
    }
}
