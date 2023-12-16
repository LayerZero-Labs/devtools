import { type OmniContract } from '@layerzerolabs/utils-evm'
import { Uln302 } from '@/uln302'
import { MainnetEndpointId } from '@layerzerolabs/lz-definitions'
import { Contract } from '@ethersproject/contracts'
import { AddressZero } from '@ethersproject/constants'
import { Uln302ExecutorConfig, Uln302UlnConfig } from '@layerzerolabs/protocol-utils'
import artifact from '@layerzerolabs/lz-evm-sdk-v2/artifacts/contracts/uln/uln302/SendUln302.sol/SendUln302.json'

describe('uln302/sdk', () => {
    let contract, omniContract: OmniContract, ulnSdk

    beforeAll(async () => {
        contract = new Contract(AddressZero, artifact.abi)
        omniContract = { eid: MainnetEndpointId.ETHEREUM_MAINNET, contract }
        ulnSdk = new Uln302(omniContract)
    })

    describe('encodeExecutorConfig', () => {
        it('should encode and decode the Uln302ExecutorConfig', async () => {
            const executorConfig: Uln302ExecutorConfig = { executor: AddressZero, maxMessageSize: 100 }
            const executorConfigEncoded = ulnSdk.encodeExecutorConfig(executorConfig)
            expect(executorConfigEncoded).toMatchSnapshot()

            const executorConfigDecoded: Uln302ExecutorConfig = ulnSdk.decodeExecutorConfig(executorConfigEncoded)
            expect(executorConfig).toEqual(executorConfigDecoded)
        })
    })

    describe('encodeUlnConfig', () => {
        it('should encode and decode the Uln302UlnConfig', async () => {
            const ulnConfig: Uln302UlnConfig = {
                confirmations: BigInt(100),
                optionalDVNThreshold: 1,
                optionalDVNs: [AddressZero, AddressZero],
                requiredDVNs: [AddressZero],
            }
            const ulnConfigEncoded = ulnSdk.encodeUlnConfig(ulnConfig)
            expect(ulnConfigEncoded).toMatchSnapshot()

            const ulnConfigDecoded: Uln302ExecutorConfig = ulnSdk.decodeUlnConfig(ulnConfigEncoded)

            expect(ulnConfig).toEqual(ulnConfigDecoded)
        })
    })
})
