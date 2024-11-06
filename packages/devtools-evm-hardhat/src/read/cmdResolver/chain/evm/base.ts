import type { JsonRpcProvider } from '@ethersproject/providers'
import { formatEid } from '@layerzerolabs/devtools'
import { parseGenericError } from '@layerzerolabs/devtools-evm'
import { createModuleLogger } from '@layerzerolabs/io-devtools'
import type { EndpointId } from '@layerzerolabs/lz-definitions'

import { ContractNotFoundError } from '@/read/common'

export class EVMViewFunctionBase {
    constructor(
        private eid: EndpointId,
        private provider: JsonRpcProvider
    ) {}

    async callContract(callData: string, toAddress: string, blockNumber: number): Promise<string> {
        const logger = createModuleLogger('EVMViewFunctionBase')
        try {
            logger.debug(`Calling contract on chain ${formatEid(this.eid)} :`, toAddress, callData)
            const result = await this.provider.call(
                {
                    to: '0x' + toAddress,
                    data: callData,
                },
                blockNumber
            )
            if (result === '0x') {
                // Check if contract is not deployed
                const byteCode = await this.provider.getCode(toAddress, blockNumber)
                if (byteCode === '0x') {
                    throw new ContractNotFoundError()
                }
            }
            return result.replace('0x', '')
        } catch (error) {
            const parsedError = parseGenericError(error)
            logger.error(`Error calling contract on chain ${formatEid(this.eid)} :`, parsedError)
            throw parsedError
        }
    }
}
