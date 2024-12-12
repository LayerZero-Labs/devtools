import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'

async function checkModule() {
    const aptosConfig = new AptosConfig({ network: Network.TESTNET })
    const aptos = new Aptos(aptosConfig)

    const address = '0x3fbe4eaad8e913821131dede129a5b9a0b62abbc33c5e085c59caf155df97bc1'

    try {
        const modules = await aptos.getAccountModules({ accountAddress: address })
        console.log(
            'Modules found:',
            modules.map((m) => m.abi?.name)
        )
    } catch (error) {
        console.error('Error fetching modules:', error)
    }

    const result = await aptos.view({
        payload: {
            function: `0x3fbe4eaad8e913821131dede129a5b9a0b62abbc33c5e085c59caf155df97bc1::oapp_core::get_delegate`,
            functionArguments: [],
        },
    })

    console.log(result[0] as string)
}

checkModule()
