import { Interface } from '@ethersproject/abi'
import { ComputeEVM, ComputeSetting } from '@layerzerolabs/lz-v2-utilities'

import { EVMViewFunctionBase } from '@/read/cmdResolver/chain/evm/base'
import type { IComputeEVMSdk, ResolvedTimeMarker } from '@/read/types'

const iOAppMapperAbi = ['function lzMap(bytes calldata _request, bytes calldata _response) view returns (bytes)']
const iOAppReducerAbi = ['function lzReduce(bytes calldata _cmd, bytes[] calldata _responses) view returns (bytes)']

export class ComputeEVMImplSdk extends EVMViewFunctionBase implements IComputeEVMSdk {
    public async resolve(
        cmd: string,
        compute: ComputeEVM,
        timeMarker: ResolvedTimeMarker,
        responses: { request: string; response: string }[]
    ): Promise<string> {
        let mappedResponses: string[]
        const computeSetting = compute.computeHeader.computeSetting

        this.validateComputeSetting(computeSetting)

        if (computeSetting !== ComputeSetting.OnlyReduce) {
            mappedResponses = await this.lzMap(compute, responses, timeMarker)
            console.log(`Finished lzMap for ${compute.to}`)
        } else {
            mappedResponses = responses.map((r) => r.response)
        }

        if (computeSetting === ComputeSetting.OnlyMap) {
            return mappedResponses.join('')
        }

        return this.lzReduce(compute, cmd, mappedResponses, timeMarker)
    }

    private validateComputeSetting(computeSetting: ComputeSetting): void {
        if (![ComputeSetting.OnlyMap, ComputeSetting.OnlyReduce, ComputeSetting.MapReduce].includes(computeSetting)) {
            throw new Error(`Unsupported compute setting: ${computeSetting}`)
        }
    }

    private async lzMap(
        compute: ComputeEVM,
        responses: { request: string; response: string }[],
        timeMarker: ResolvedTimeMarker
    ): Promise<string[]> {
        const oAppInterface = new Interface(iOAppMapperAbi)

        return await Promise.all(
            responses.map(async (r) => {
                const mapCallData = oAppInterface.encodeFunctionData('lzMap', ['0x' + r.request, '0x' + r.response])

                const mappedResponse = await this.callContract(mapCallData, compute.to, timeMarker.blockNumber)
                console.log(`Mapped response for ${compute.to}: ${mappedResponse}`)
                return oAppInterface.decodeFunctionResult('lzMap', `0x${mappedResponse}`)[0].replace('0x', '')
            })
        )
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
        console.log(`Reduced response for ${compute.to}: ${response}`)
        return oAppInterface.decodeFunctionResult('lzReduce', `0x${response}`)[0].replace('0x', '')
    }
}
