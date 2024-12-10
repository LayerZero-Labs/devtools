import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk'
import { OFT } from '../../sdk/oft'
import { getAptosOftAddress, sendAllTxs } from '../utils/utils'
import { getLzNetworkStage, parseYaml } from '../utils/aptosNetworkParser'

async function main() {
    const { account_address, private_key, network } = await parseYaml()
    console.log(`Using aptos network ${network}`)

    const aptosConfig = new AptosConfig({ network: Network.TESTNET })
    const aptos = new Aptos(aptosConfig)

    const lzNetworkStage = getLzNetworkStage(network)
    const aptosOftAddress = getAptosOftAddress(lzNetworkStage)
    console.log(`\n⚡ Initializing Aptos OFT`)
    console.log(`   Address: ${aptosOftAddress}\n`)

    const tokenName = 'OFT'
    const tokenSymbol = 'OFT'
    const iconUri = ''
    const projectUri = ''
    const sharedDecimals = 6
    const localDecimals = 6

    console.log(`\tToken Name: ${tokenName}`)
    console.log(`\tToken Symbol: ${tokenSymbol}`)
    console.log(`\tIcon URI: ${iconUri}`)
    console.log(`\tProject URI: ${projectUri}`)
    console.log(`\tShared Decimals: ${sharedDecimals}`)
    console.log(`\tLocal Decimals: ${localDecimals}`)

    const oft = new OFT(aptos, aptosOftAddress, account_address, private_key)
    const initializePayload = oft.initializePayload(
        tokenName,
        tokenSymbol,
        iconUri,
        projectUri,
        sharedDecimals,
        localDecimals
    )
    sendAllTxs(aptos, oft, account_address, [initializePayload])
}

main().catch((error) => {
    console.error('Error:', error)
    process.exit(1)
})
