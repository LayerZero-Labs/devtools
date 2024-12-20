import assert from 'assert'

import { Interface } from '@ethersproject/abi'
import { ComputeEVM, ComputeSetting } from '@layerzerolabs/lz-v2-utilities'
import {
    type RequestResponsePair,
    type ResolvedTimeMarker,
    type IComputerEVM,
    UnresolvableCommandError,
} from '@layerzerolabs/ua-devtools'
import { RevertError } from '@layerzerolabs/devtools-evm'
import { createDefaultApplicative } from '@layerzerolabs/devtools'

import { ContractNotFoundError, EVMViewFunctionBase } from '@/read'

const iOAppMapperAbi = ['function lzMap(bytes calldata _request, bytes calldata _response) view returns (bytes)']
const iOAppReducerAbi = ['function lzReduce(bytes calldata _cmd, bytes[] calldata _responses) view returns (bytes)']

export class ComputerEVM extends EVMViewFunctionBase implements IComputerEVM {
    public async resolve(
        cmd: string,
        compute: ComputeEVM,
        timeMarker: ResolvedTimeMarker,
        responses: RequestResponsePair[]
    ): Promise<string> {
        const computeSetting = compute.computeHeader.computeSetting

        this.validateComputeSetting(computeSetting)

        try {
            const mapper =
                computeSetting === ComputeSetting.OnlyReduce
                    ? (this.logger.info('OnlyReduce setting is used. Skipping map step.'),
                      (r: RequestResponsePair) => r.response)
                    : (r: RequestResponsePair) => this.lzMap(compute, r, timeMarker)
            const reducer =
                computeSetting === ComputeSetting.OnlyMap
                    ? (this.logger.info('OnlyMap setting is used. Skipping reduce step.'),
                      (mappedResponses: string[]) => mappedResponses.join(''))
                    : (mappedResponses: string[]) => this.lzReduce(compute, cmd, mappedResponses, timeMarker)

            const applicative = createDefaultApplicative(this.logger)
            const mapped = await applicative(responses.map((r) => () => mapper(r)))
            const reduced = await reducer(mapped)
            return reduced
        } catch (error) {
            if (error instanceof ContractNotFoundError || error instanceof RevertError) {
                this.logger.error(`Error on resolving compute section of command: ${error}`)
                throw new UnresolvableCommandError()
            }
            throw error
        }
    }

    private validateComputeSetting(computeSetting: ComputeSetting): void {
        assert(
            [ComputeSetting.OnlyMap, ComputeSetting.OnlyReduce, ComputeSetting.MapReduce].includes(computeSetting),
            `Unsupported compute setting: ${computeSetting}`
        )
    }

    private async lzMap(
        compute: ComputeEVM,
        requestResponsePair: RequestResponsePair,
        timeMarker: ResolvedTimeMarker
    ): Promise<string> {
        const oAppInterface = new Interface(iOAppMapperAbi)

        const mapCallData = oAppInterface.encodeFunctionData('lzMap', [
            '0x' + requestResponsePair.request,
            '0x' + requestResponsePair.response,
        ])
        const mappedResponse = await this.callContract(mapCallData, compute.to, timeMarker.blockNumber)
        this.logger.debug(`Mapped response for request ${requestResponsePair.request}: ${mappedResponse}`)
        return oAppInterface.decodeFunctionResult('lzMap', `0x${mappedResponse}`)[0].replace('0x', '')
    }

    private async lzReduce(
        compute: ComputeEVM,
        cmd: string,
        responses: string[],
        timeMarker: ResolvedTimeMarker
    ): Promise<string> {
        const oAppInterface = new Interface(iOAppReducerAbi)

        const reduceCallData = oAppInterface.encodeFunctionData('lzReduce', [
            cmd,
            responses.map((response) => '0x' + response),
        ])

        const response = await this.callContract(reduceCallData, compute.to, timeMarker.blockNumber)
        this.logger.debug(`Reduced response: ${response}`)
        return oAppInterface.decodeFunctionResult('lzReduce', `0x${response}`)[0].replace('0x', '')
    }
}
