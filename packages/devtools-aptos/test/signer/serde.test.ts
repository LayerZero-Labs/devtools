import {
    ModuleId,
    AccountAddress,
    Identifier,
    Serializer,
    Deserializer,
    Aptos,
    InputEntryFunctionData,
    Network,
    AptosConfig,
    SimpleTransaction,
} from '@aptos-labs/ts-sdk'
import { serializeFunctionArgs } from '../../src/omnigraph/serializer'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import type { OmniPoint } from '@layerzerolabs/devtools'
import { serializeTransactionPayload } from '../../src/signer/serde'
import { OmniSDK } from '../../src/omnigraph/sdk'

class MyOmniSDK extends OmniSDK {
    constructor(aptos: Aptos, point: OmniPoint) {
        super(aptos, point)
    }

    public override async serializeTransactionData(data: InputEntryFunctionData): Promise<string> {
        return super.serializeTransactionData(data)
    }
}

describe('signer/serde', () => {
    describe('serializeTransactionPayload / deserializeTransactionPayload', () => {
        it('should work', () => {
            // const transactionEntryFunction = new TransactionPayloadEntryFunction(
            //     EntryFunction.build(
            //         '0x58b730d07e98a22f2b357bee721115c986e4dc873c1884763708ee3d4006f74e::transfer',
            //         'transfer',
            //         [],
            //         []
            //     )
            // )
            // const address = AccountAddress.fromString(
            //     '0x58b730d07e98a22f2b357bee721115c986e4dc873c1884763708ee3d4006f74e'
            // )
            // const moduleName = new Identifier('module') // Changed from 'transfer'
            // const moduleId = new ModuleId(
            //     AccountAddress.fromString('0x58b730d07e98a22f2b357bee721115c986e4dc873c1884763708ee3d4006f74e'),
            //     new Identifier('transfer')
            // )
            // const structTag = new TypeTagStruct(
            //     new StructTag(
            //         address,
            //         moduleName,
            //         new Identifier('CoinType'),
            //         [] // no type parameters for the struct itself
            //     )
            // )
            // const entryFunction = new EntryFunction(
            //     moduleId,
            //     new Identifier('transfer'),  // function name
            //     [structTag],  // type arguments
            //     [
            //         AccountAddress.fromString('0x1'),  // destination address
            //         new U64(1000n)  // amount
            //     ]  // function arguments
            // )
            // Create the TransactionPayloadEntryFunction wrapper
            // const transactionEntryFunction = new TransactionPayloadEntryFunction(entryFunction)
            // const serialized = serializeTransactionPayload(transactionEntryFunction)
            // const deserialized = deserializeTransactionPayload(serialized)
            // expect(deserialized).toEqual(transactionEntryFunction)
            // const serializer = new Serializer()
            // transactionEntryFunction.serialize(serializer)
            // const result = serializer.toUint8Array()
            // const deserializer = new Deserializer(result)
            // const deserialized = TransactionPayloadEntryFunction.load(deserializer)
            // expect(deserialized).deep.equal(transactionEntryFunction)
        })

        it.only('should work with omniSDK', async () => {
            const config = new AptosConfig({
                network: Network.CUSTOM,
                fullnode: 'http://127.0.0.1:8080/v1',
                indexer: 'http://127.0.0.1:8090/v1',
            })

            const address = '0x58b730d07e98a22f2b357bee721115c986e4dc873c1884763708ee3d4006f74e'
            const addressBytes = Uint8Array.from(Buffer.from(address.slice(2), 'hex'))

            // Example usage of serializeTransactionData
            // const txData: InputEntryFunctionData = {
            //     function: '0x58b730d07e98a22f2b357bee721115c986e4dc873c1884763708ee3d4006f74e::oapp_core::set_peer', // Using a simple module path for example
            //     functionArguments: [
            //         EndpointId.AVALANCHE_MAINNET,
            //         MoveVector.U8(Array.from(addressBytes)), // example peer address as Uint8Array
            //     ],
            //     typeArguments: [],
            // }
            /// using just string for address
            const txData: InputEntryFunctionData = {
                function: '0x58b730d07e98a22f2b357bee721115c986e4dc873c1884763708ee3d4006f74e::oapp_core::set_peer', // Using a simple module path for example
                functionArguments: [
                    EndpointId.AVALANCHE_MAINNET, // this gets mad because it expects a u32
                    address, // example peer address as Uint8Array
                ],
                typeArguments: [],
            }

            // simpleTransaction.rawTransaction.payload.

            // const transactionEntryFunction = await generateTransactionPayload({
            //     ...txData,
            //     aptosConfig: config,
            // })
            const aptos = new Aptos(config)
            const simpleTransaction = await aptos.transaction.build.simple({
                sender: '0x58b730d07e98a22f2b357bee721115c986e4dc873c1884763708ee3d4006f74e',
                data: txData,
            })

            expect(simpleTransaction).toBeDefined()
            console.log(simpleTransaction.toString())

            const serialized = serializeTransactionPayload(simpleTransaction)
            console.log('Type of serialized:', typeof serialized)
            console.log('Serialized contents:', serialized)

            const deserializer = new Deserializer(Uint8Array.from(Buffer.from(serialized, 'hex')))
            const deserialized = deserializer.deserialize(SimpleTransaction)
            console.log('########################deserialized########################')
            console.dir(deserialized, { depth: null })
            // const deserialized = deserializeTransactionPayload(deserializer)
            console.log('~~~~~~~~~~~~~~~~~~~~simpleTransaction~~~~~~~~~~~~~~~~~~~')
            console.dir(simpleTransaction, { depth: null })
            expect(deserialized).toEqual(simpleTransaction)
            // console.log('deserialized')
            // console.dir(deserialized, { depth: null })
            // expect(deserialized).toEqual(simpleTransaction)
            // console.log('transactionEntryFunction', Array.from(transactionEntryFunction.entryFunction.args.values()))
            // expect(deserialized).toEqual(transactionEntryFunction)

            // const serializer = new Serializer()
            // // serializer.serialize()
            // const original = transactionEntryFunction.entryFunction
            // console.log("original", original)
            // transactionEntryFunction.entryFunction.serialize(serializer)
            // console.log("test", transactionEntryFunction.entryFunction.serialize(serializer))
            // console.log("serialized", original)
            // // transactionEntryFunction.serialize(serializer)
            // const result = serializer.toUint8Array()
            // const deserializer = new Deserializer(Buffer.from(result))
            // console.log(result)
            // const deserialized = EntryFunction.deserialize(deserializer)

            // console.log("deserialized", deserialized)
            // console.log("transactionEntryFunction.entryFunction", transactionEntryFunction.entryFunction)
        })
        it('should serialize function args', async () => {
            const config = new AptosConfig({
                network: Network.CUSTOM,
                fullnode: 'http://127.0.0.1:8080/v1',
                indexer: 'http://127.0.0.1:8090/v1',
            })

            const address = '0x58b730d07e98a22f2b357bee721115c986e4dc873c1884763708ee3d4006f74e'
            // const addressBytes = Uint8Array.from(Buffer.from(address.slice(2), 'hex'))

            // Example usage of serializeTransactionData
            // commenting out because it needs just string address rather than u8 array
            // const txData: InputEntryFunctionData = {
            //     function: '0x58b730d07e98a22f2b357bee721115c986e4dc873c1884763708ee3d4006f74e::oapp_core::set_peer', // Using a simple module path for example
            //     functionArguments: [
            //         EndpointId.AVALANCHE_MAINNET,
            //         MoveVector.U8(Array.from(addressBytes)), // example peer address as Uint8Array
            //     ],
            //     typeArguments: [],
            // }

            const txData: InputEntryFunctionData = {
                function: '0x58b730d07e98a22f2b357bee721115c986e4dc873c1884763708ee3d4006f74e::oapp_core::set_peer', // Using a simple module path for example
                functionArguments: [
                    EndpointId.AVALANCHE_MAINNET,
                    address, // example peer address as Uint8Array
                ],
                typeArguments: [],
            }

            // simpleTransaction.rawTransaction.payload.

            // const transactionEntryFunction = await generateTransactionPayload({
            //     ...txData,
            //     aptosConfig: config,
            // })
            const aptos = new Aptos(config)
            const simpleTransaction = await aptos.transaction.build.simple({
                sender: '0x58b730d07e98a22f2b357bee721115c986e4dc873c1884763708ee3d4006f74e',
                data: txData,
            })

            const serialized = serializeFunctionArgs(txData.functionArguments, ['u32', 'vector<u8>'])
            console.log('~~~~~~~~~~~~~~~~~~~~serialized~~~~~~~~~~~~~~~~~~~')
            console.dir(serialized, { depth: null })
            // TODO: Alvin what deserializer do we need to use here?
        })
        it('should serialize a module', () => {
            const moduleId = new ModuleId(
                AccountAddress.fromString('0x58b730d07e98a22f2b357bee721115c986e4dc873c1884763708ee3d4006f74e'),
                new Identifier('transfer')
            )

            const serializer = new Serializer()
            serializer.serialize(moduleId)
            const result = serializer.toUint8Array()
            console.log(result)
            const deserializer = new Deserializer(result)
            const deserialized = ModuleId.deserialize(deserializer)
            expect(deserialized).toEqual(moduleId)
        })
    })
})
