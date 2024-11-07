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
            logger.debug(
                `Calling contract on chain ${formatEid(this.eid)}, address ${'0x' + toAddress}, calldata ${callData} at blockNumber ${blockNumber}`
            )
            const result = await this.provider.call(
                {
                    to: '0x' + toAddress,
                    data: callData,
                },
                blockNumber
            )
            if (result === '0x') {
                // Check if contract is not deployed
                logger.debug(
                    `0x returned, checking if target contract is deployed on chain ${formatEid(this.eid)}, address ${'0x' + toAddress} at blockNumber ${blockNumber}`
                )
                const byteCode = await this.provider.getCode(toAddress, blockNumber)
                if (byteCode === '0x') {
                    logger.debug('Contract not found at address, throwing ContractNotFoundError')
                    throw new ContractNotFoundError()
                }
            }
            return result.replace('0x', '')
        } catch (error) {
            if (error instanceof ContractNotFoundError) {
                throw error
            }
            const parsedError = parseGenericError(error)
            logger.error(`Error calling contract on chain ${formatEid(this.eid)} :`, parsedError)
            throw parsedError
        }
    }
}
