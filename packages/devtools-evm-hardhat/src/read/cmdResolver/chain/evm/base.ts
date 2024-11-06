import type { JsonRpcProvider } from '@ethersproject/providers'
import { parseGenericError } from '@layerzerolabs/devtools-evm'
import type { EndpointId } from '@layerzerolabs/lz-definitions'

import { ContractNotFoundError } from '@/read/common'

export class EVMViewFunctionBase {
    constructor(
        private eid: EndpointId,
        private provider: JsonRpcProvider
    ) {}

    async callContract(callData: string, toAddress: string, blockNumber: number): Promise<string> {
        try {
            console.log(`Calling contract on chain with eid ${this.eid} :`, toAddress, callData)
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
            console.error(`Error calling contract on chain with eid ${this.eid} :`, error)
            const parsedError = parseGenericError(error)
            throw parsedError
        }
    }
}
