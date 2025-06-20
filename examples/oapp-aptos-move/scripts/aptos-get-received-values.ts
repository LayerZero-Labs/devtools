import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'

/**
 * A utility script to verify cross-chain message delivery by checking the last received values.
 * The values are updated each time a message is successfully received by the OApp,
 * providing a simple way to confirm that cross-chain communication is working as expected.
 */
async function main() {
    const config = new AptosConfig({ network: Network.TESTNET })
    const aptos = new Aptos(config)
    const oappAddress = '<your-oapp-address>'

    console.log('Fetching receive values...')
    console.log('---')

    const [counterResult, address1Result, address2Result, numberResult, rawMessageResult] = await Promise.all([
        aptos.view({
            payload: {
                function: `${oappAddress}::oapp::get_counter`,
                typeArguments: [],
            },
        }),
        aptos.view({
            payload: {
                function: `${oappAddress}::oapp::get_decoded_address1`,
                typeArguments: [],
            },
        }),
        aptos.view({
            payload: {
                function: `${oappAddress}::oapp::get_decoded_address2`,
                typeArguments: [],
            },
        }),
        aptos.view({
            payload: {
                function: `${oappAddress}::oapp::get_decoded_number`,
                typeArguments: [],
            },
        }),
        aptos.view({
            payload: {
                function: `${oappAddress}::oapp::get_raw_message`,
                typeArguments: [],
            },
        }),
    ])

    console.log('- Counter:', counterResult[0])
    console.log('- Address 1:', address1Result[0])
    console.log('- Address 2:', address2Result[0])
    console.log('- Number:', numberResult[0])
    console.log('- Raw Message:', rawMessageResult[0])
    console.log('---')
}

main().catch(console.error)
