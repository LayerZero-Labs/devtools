import type { JsonRpcProvider } from '@ethersproject/providers'
import { formatEid, isZero, mapError, tapError } from '@layerzerolabs/devtools'
import { createModuleLogger, type Logger } from '@layerzerolabs/io-devtools'
import type { EndpointId } from '@layerzerolabs/lz-definitions'

import { ContractNotFoundError, BytesSchema } from '@/read/'
import { parseGenericError } from '@layerzerolabs/devtools-evm'

export class EVMViewFunctionBase {
    constructor(
        public readonly eid: EndpointId,
        protected readonly provider: JsonRpcProvider,
        protected readonly logger: Logger = createModuleLogger(`EVM View SDK ${new.target.name} @ ${formatEid(eid)}`)
    ) {}

    async callContract(callData: string, toAddress: string, blockNumber: number): Promise<string> {
        this.logger.debug(
            `Calling contract on chain ${formatEid(this.eid)}, address ${'0x' + toAddress}, calldata ${callData} at blockNumber ${blockNumber}`
        )
        const result = await mapError(
            () =>
                this.provider.call(
                    {
                        to: '0x' + toAddress,
                        data: callData,
                    },
                    blockNumber
                ),
            (error) => {
                const parsedError = parseGenericError(error)
                this.logger.error(`Error calling contract on chain ${formatEid(this.eid)} : ${parsedError}`)
                return parsedError
            }
        )

        await tapError(
            () => BytesSchema.parse(result),
            (error) => {
                this.logger.error(`Error parsing result from contract call on chain ${formatEid(this.eid)} : ${error}`)
            }
        )

        if (!isZero(result)) {
            return result.replace('0x', '')
        }

        this.logger.debug(
            `0x returned, checking if target contract is deployed on chain ${formatEid(this.eid)}, address ${'0x' + toAddress} at blockNumber ${blockNumber}`
        )

        const byteCode = await this.provider.getCode(toAddress, blockNumber)
        if (isZero(byteCode)) {
            this.logger.debug('Contract not found at address, throwing ContractNotFoundError')
            throw new ContractNotFoundError()
        }

        return result.replace('0x', '')
    }
}
