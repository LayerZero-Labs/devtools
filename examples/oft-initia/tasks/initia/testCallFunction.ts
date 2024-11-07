// {
//     "address": "0x2e2de55e5162d58c41de389ccf6d7ca8de3940a6",
//     "name": "MyOFT-v2",
//     "moduleName": "MyOFT",
//     "network": "initia-testnet",
//     "compatibleVersions": [
//       "v2"
//     ],
//     "bytecodeHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
//     "transactionHash": "122EC5A4FF7E6C86609F8F82E9EA6CB7E32BDD873C5480149F1F5565B3BF9CEA"
//   }
import { RESTClient, bcs } from '@initia/initia.js'
import 'dotenv/config'

async function testCallFunction() {
    const rest = new RESTClient('https://rest.testnet.initia.xyz', {
        chainId: 'initiation-2',
    })

    try {
        const rawResult = await rest.move.viewFunction(
            // '0x2e2de55e5162d58c41de389ccf6d7ca8de3940a6',
            'init19ck72hj3vt2ccsw78zwv7mtu4r0rjs9xzf3gc3',
            'Memecoin',
            'hello_world',
            [],
            []
        )

        if (!Array.isArray(rawResult) || rawResult.length === 0) {
            throw new Error('Unexpected result format')
        }

        const base64Value = rawResult[0] as string
        const buffer = Buffer.from(base64Value, 'base64')
        const value = Number(bcs.u64().parse(buffer))
        console.log('Successfully called hello_world(). Return value:', value)

        if (value === 42) {
            console.log('✅ Test passed: Returned expected value of 42')
        } else {
            console.log('❌ Test failed: Expected 42, got', value)
        }
    } catch (error) {
        console.error('Error calling contract:', error)
    }
}

testCallFunction()
