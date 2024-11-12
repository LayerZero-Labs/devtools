import type { JsonRpcProvider } from '@ethersproject/providers'
import type { EndpointId } from '@layerzerolabs/lz-definitions'

import { dedup, isBlockMatchingTimestamp } from '@/read/common'
import type {
    ITimeMarkerValidatorChainSdk,
    BlockTime,
    ResolvedTimeMarker,
    ResolvedTimestampTimeMarker,
} from '@/read/types'

export class EVMTimeMarkerValidatorChainSdk implements ITimeMarkerValidatorChainSdk {
    constructor(
        private eid: EndpointId,
        private provider: JsonRpcProvider
    ) {}

    async checkResolvedTimeMarkerValidity(tms: Omit<ResolvedTimestampTimeMarker, 'eid'>[]): Promise<void> {
        const blockNumberToFetch = dedup(
            tms.map((tms) => [tms.blockNumber, Math.max(tms.blockNumber - 1, 1)]).flat(),
            (a, b) => a === b
        )

        const timestampMapping: { [blockNumber: number]: number } = {}

        await Promise.all(
            blockNumberToFetch.map(async (blockNumber) => {
                const block = await this.provider.getBlock(blockNumber)
                timestampMapping[blockNumber] = block.timestamp
            })
        )

        for (const tm of tms) {
            const blockNumber = tm.blockNumber
            const timestamp = tm.timestamp

            const blockTime = {
                number: blockNumber,
                timestamp: timestampMapping[blockNumber],
            } as BlockTime
            const previousBlockTime =
                blockNumber === 1
                    ? null
                    : ({
                          number: blockNumber - 1,
                          timestamp: timestampMapping[blockNumber - 1],
                      } as BlockTime)

            if (!isBlockMatchingTimestamp(blockTime, previousBlockTime, timestamp)) {
                throw new Error(
                    `Invalid resolved time marker for eid ${this.eid}: blockNumber ${blockNumber} with resolved timestamp ${timestamp} does not meet actual timestamp for blockNumber ${blockTime.timestamp} and previous blockNumber ${previousBlockTime?.timestamp}`
                )
            }
        }
    }

    async assertTimeMarkerBlockConfirmations(tms: Omit<ResolvedTimeMarker, 'eid'>[]): Promise<void> {
        const maxBlockConfirmation = Math.max(...tms.map((tm) => tm.blockNumber + tm.blockConfirmation))
        const currentBlock = await this.provider.getBlock('latest')
        if (maxBlockConfirmation > currentBlock.number) {
            throw new Error(
                `Block confirmation for eid ${this.eid} for time marker is greater than current block number: ${maxBlockConfirmation} > ${currentBlock.number}`
            )
        }
    }
}
