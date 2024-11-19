import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'

const ACCOUNT_ADDRESS = '0x58b730d07e98a22f2b357bee721115c986e4dc873c1884763708ee3d4006f74e'

export const getInitiaBlockNumber = async () => {
    const config = new AptosConfig({
        network: Network.CUSTOM,
        fullnode: 'http://127.0.0.1:8080/v1',
        indexer: 'http://127.0.0.1:8090/v1',
    })
    const aptos = new Aptos(config)

    try {
        const myAccount = await aptos.getAccountInfo({ accountAddress: ACCOUNT_ADDRESS })
        console.log('Account Info:\n', myAccount)
        const modules = await aptos.getAccountModules({
            accountAddress: ACCOUNT_ADDRESS,
        })
        console.log('Account Address: ', ACCOUNT_ADDRESS)

        console.log('Account Modules:\n', modules)
    } catch (error) {
        console.error('Error:', error)
    }
}
