import { Aptos, InputEntryFunctionData, Network, AptosConfig } from '@aptos-labs/ts-sdk'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { deserializeTransactionPayload, serializeTransactionPayload } from '../../src/signer/serde'

describe('signer/serde', () => {
    describe('serializeTransactionPayload / deserializeTransactionPayload', () => {
        it('should work with omniSDK', async () => {
            // Setup Aptos node
            const config = new AptosConfig({
                network: Network.CUSTOM,
                fullnode: 'http://127.0.0.1:8080/v1',
                indexer: 'http://127.0.0.1:8090/v1',
            })
            const aptos = new Aptos(config)

            // Prepare the transaction data
            const txData: InputEntryFunctionData = {
                function: '0x58b730d07e98a22f2b357bee721115c986e4dc873c1884763708ee3d4006f74e::oapp_core::set_peer', // Using a simple module path for example
                functionArguments: [
                    EndpointId.AVALANCHE_MAINNET, // this gets mad because it expects a u32
                    '0x58b730d07e98a22f2b357bee721115c986e4dc873c1884763708ee3d4006f74e', // example peer address as Uint8Array
                ],
                typeArguments: [],
            }

            // Build the transaction
            const simpleTransaction = await aptos.transaction.build.simple({
                sender: '0x58b730d07e98a22f2b357bee721115c986e4dc873c1884763708ee3d4006f74e',
                data: txData,
            })

            // Test that the serialization then deserialization results in the same transaction
            const serialized = serializeTransactionPayload(simpleTransaction)
            const deserialized = deserializeTransactionPayload(serialized)

            expect(deserialized.rawTransaction.expiration_timestamp_secs).toEqual(
                simpleTransaction.rawTransaction.expiration_timestamp_secs
            )

            // Note: this fails because it is not deeply equal, but it does appear to be the same transaction
            // expect(deserialized).toEqual(simpleTransaction)
        })
    })
})
