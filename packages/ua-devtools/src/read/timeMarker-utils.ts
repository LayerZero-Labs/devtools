import {
    CommandRequest,
    Compute,
    ComputeEVM,
    ComputeType,
    ResolverType,
    SingleViewFunctionEVMCall,
    TimestampBlockConfiguration,
} from '@layerzerolabs/lz-v2-utilities'
import type { EndpointId } from '@layerzerolabs/lz-definitions'
import type {
    BlockTime,
    ResolvedTimeMarker,
    ResolvedTimestampTimeMarker,
    TimeMarker,
    TimestampTimeMarker,
} from './types'

export const dedup =
    <T>(isEqual: (a: T, b: T) => boolean) =>
    (arr: T[]): T[] => {
        return arr.reduce<T[]>((acc, item) => {
            if (!acc.some((existingItem) => isEqual(existingItem, item))) {
                acc.push(item)
            }
            return acc
        }, [])
    }

export const isEqualTimeMarker = (a: TimeMarker, b: TimeMarker): boolean => {
    return (
        a.eid === b.eid &&
        a.isBlockNumber === b.isBlockNumber &&
        a.blockNumber === b.blockNumber &&
        a.timestamp === b.timestamp &&
        a.blockConfirmation === b.blockConfirmation
    )
}

export const dedupTimeMarkers = dedup<TimeMarker>(isEqualTimeMarker)

export const extractTimeMarker = (req: SingleViewFunctionEVMCall | ComputeEVM): TimeMarker => {
    const baseTimeMarker = {
        blockConfirmation: req.blockConfirmations,
        eid: req.targetEid,
    }
    if (req.timestampBlockFlag === TimestampBlockConfiguration.Timestamp) {
        return {
            ...baseTimeMarker,
            isBlockNumber: false,
            timestamp: Number(req.timestamp!),
        }
    }
    return {
        ...baseTimeMarker,
        isBlockNumber: true,
        blockNumber: Number(req.blockNumber!),
    }
}

const findResolvedTimeMarker = (
    timeMarker: TimestampTimeMarker,
    resolvedTimeMarkers: ResolvedTimestampTimeMarker[]
): ResolvedTimestampTimeMarker => {
    const resolvedTimeMarker = resolvedTimeMarkers.find(
        (tm) =>
            tm.eid === timeMarker.eid &&
            tm.timestamp === timeMarker.timestamp &&
            tm.blockConfirmation === timeMarker.blockConfirmation
    )

    if (!resolvedTimeMarker) {
        throw new Error(`Could not find resolved time marker for ${JSON.stringify(timeMarker)}`)
    }
    return resolvedTimeMarker
}

export const applyResolvedTimestampTimeMarkers = (
    tms: TimestampTimeMarker[],
    rtms: ResolvedTimestampTimeMarker[]
): ResolvedTimestampTimeMarker[] => {
    return tms.map((tm) => {
        return findResolvedTimeMarker(tm, rtms)
    })
}

export const findRequestResolvedTimeMarker = (
    request: CommandRequest,
    timeMarkers: ResolvedTimestampTimeMarker[]
): ResolvedTimeMarker => {
    switch (request.requestHeader.resolverType) {
        case ResolverType.SingleViewFunctionEVMCall: {
            const timeMarker = extractTimeMarker(request as SingleViewFunctionEVMCall)
            if (timeMarker.isBlockNumber) {
                return timeMarker
            }
            return findResolvedTimeMarker(timeMarker, timeMarkers)
        }
        default:
            throw new Error(`Unsupported resolver type: ${request.requestHeader.resolverType}`)
    }
}

export const findComputeResolvedTimeMarker = (
    compute: Compute,
    timeMarkers: ResolvedTimestampTimeMarker[]
): ResolvedTimeMarker => {
    switch (compute.computeHeader.computeType) {
        case ComputeType.SingleViewFunctionEVMCall: {
            const timeMarker = extractTimeMarker(compute as ComputeEVM)
            if (timeMarker.isBlockNumber) {
                return timeMarker
            }
            return findResolvedTimeMarker(timeMarker, timeMarkers)
        }
        default:
            throw new Error(`Unsupported compute type: ${compute.computeHeader.computeType}`)
    }
}

export const groupByEid = <T extends { eid: EndpointId }>(arr: T[]): Map<number, T[]> => {
    return arr.reduce((acc, item) => {
        if (!acc.has(item.eid)) {
            acc.set(item.eid, [])
        }
        acc.get(item.eid)!.push(item)
        return acc
    }, new Map<number, T[]>())
}

export const isBlockMatchingTimestamp = (
    block: BlockTime,
    previousBlock: BlockTime | null,
    targetTimestamp: number
): boolean => {
    return block.number === 1
        ? block.timestamp == targetTimestamp
        : block.timestamp >= targetTimestamp && previousBlock!.timestamp < targetTimestamp
}
