import type { JsonRpcProvider } from '@ethersproject/providers'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { isBlockMatchingTimestamp, type BlockTime, type ITimeMarkerResolverChain } from '@layerzerolabs/ua-devtools'
import assert from 'assert'

const updateLowerBoundBlock = (lowerBoundBlock: BlockTime | null, potentialBlock: BlockTime): BlockTime | null => {
    // This is a max function between two blocks
    return !lowerBoundBlock || lowerBoundBlock.number < potentialBlock.number ? potentialBlock : lowerBoundBlock
}

const updateUpperBoundBlock = (upperBoundBlock: BlockTime | null, potentialBlock: BlockTime): BlockTime | null => {
    // This is a min function between two blocks
    return !upperBoundBlock || upperBoundBlock.number > potentialBlock.number ? potentialBlock : upperBoundBlock
}

const calculateAvgBlockTime = (leftBlock: BlockTime, rightBlock: BlockTime): number => {
    assert(rightBlock.number != leftBlock.number, 'Invalid block: The two blocks have the same number')
    const avgBlockTime = (rightBlock.timestamp - leftBlock.timestamp) / (rightBlock.number - leftBlock.number)

    if (avgBlockTime < 0) {
        throw new Error('Invalid block: The block with a smaller number has a larger timestamp')
    }

    return avgBlockTime
}

export class EVMTimeMarkerResolverChain implements ITimeMarkerResolverChain {
    constructor(
        public readonly eid: EndpointId,
        protected readonly provider: JsonRpcProvider
    ) {}

    public async resolveTimestamps(timestamps: number[]): Promise<{ [timestamp: number]: number }> {
        const provider = this.provider
        // Starting with an average block time of 1 second
        let avgBlockTime = 1000

        const resolvedTimeMarkers: { [timestamp: number]: number } = {}

        // deduplicate timestamps
        const uniqueTimestamps = Array.from(new Set(timestamps))

        await Promise.all(
            uniqueTimestamps.map(async (targetTimestamp) => {
                const latestBlock: BlockTime = await provider.getBlock('latest')
                if (targetTimestamp > latestBlock.timestamp) {
                    throw new Error(`Target timestamp ${targetTimestamp} is in the future`)
                }

                let currentBlock: BlockTime = latestBlock
                let upperBoundBlock: BlockTime | null = latestBlock
                let lowerBoundBlock: BlockTime | null = null

                let iterate: boolean = true

                while (iterate) {
                    // Calculate the number of blocks to go back (negative value means to go forward)
                    let blocksToJump = Math.floor((currentBlock.timestamp - targetTimestamp) / avgBlockTime)
                    blocksToJump = blocksToJump === 0 ? 1 : blocksToJump

                    // Get the next block
                    const targetBlockToJumpTo = Math.min(
                        Math.max(currentBlock.number - blocksToJump, 1),
                        latestBlock.number
                    )

                    const [nextBlock, nextBlockMinusOne] = await Promise.all([
                        provider.getBlock(targetBlockToJumpTo),
                        targetBlockToJumpTo > 1 ? provider.getBlock(targetBlockToJumpTo - 1) : Promise.resolve(null),
                    ])

                    // Check if the target timestamp is between the nextBlock and previousBlock
                    if (isBlockMatchingTimestamp(nextBlock, nextBlockMinusOne, targetTimestamp)) {
                        resolvedTimeMarkers[targetTimestamp] = nextBlock.number
                        iterate = false
                        break
                    }

                    if (nextBlock.number === 1 && nextBlock.timestamp > targetTimestamp) {
                        throw new Error(`Requested a timestamp lower than the first block: ${targetTimestamp}`)
                    }

                    if (nextBlock.timestamp >= targetTimestamp) {
                        // upperBoundBlock is the block with the smallest number among the visited blocks with a timestamp >= targetTimestamp
                        upperBoundBlock = updateUpperBoundBlock(upperBoundBlock, nextBlock)
                    } else {
                        // lowerBoundBlock is the block with the largest number among the visited blocks with a timestamp < targetTimestamp
                        lowerBoundBlock = updateLowerBoundBlock(lowerBoundBlock, nextBlock)
                    }

                    // until lowerBoundBlock is available, use the avgBlockTime calculated from the latestBlock and nextBlock
                    // avgBlockTime using the lowerBoundBlock and upperBoundBlock is more accurate if lowerBoundBlock is available
                    // because the target timestamp is between lowerBoundBlock and upperBoundBlock
                    const updatedAvgBlockTime = lowerBoundBlock
                        ? calculateAvgBlockTime(lowerBoundBlock, upperBoundBlock!)
                        : calculateAvgBlockTime(nextBlock, latestBlock)

                    // Check if the updated avgBlockTime is valid
                    if (updatedAvgBlockTime > 0) {
                        avgBlockTime = updatedAvgBlockTime
                    }

                    currentBlock = nextBlock
                }
            })
        )
        return resolvedTimeMarkers
    }
}
