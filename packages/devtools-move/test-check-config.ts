import { EndpointId } from '@layerzerolabs/lz-definitions'
import { checkConfig } from './tasks/evm/wire/checkConfig'

async function runCheckConfig() {
    const contracts = [
        {
            address: '0xC3D4E9Ac47D7f37bB07C2f8355Bb4940DEA3bbC3',
            eid: EndpointId.SOMNIA_V2_MAINNET,
            rpc: 'https://api.infra.mainnet.somnia.network/',
        },
        {
            address: '0x1B0F6590d21dc02B92ad3A7D00F8884dC4f1aed9',
            eid: EndpointId.ETHEREUM_V2_MAINNET,
            rpc: 'https://eth-mainnet.public.blastapi.io',
        },
        {
            address: '0x363aaE994B139096c7C82492a4AEfFB3Cfc7dD49',
            eid: EndpointId.BSC_V2_MAINNET,
            rpc: 'https://bsc-mainnet.public.blastapi.io',
        },
        {
            address: '0x47636b3188774a3E7273D85A537b9bA4Ee7b2535',
            eid: EndpointId.BASE_V2_MAINNET,
            rpc: 'https://mainnet.base.org',
        },
    ]

    console.log('🔍 Starting config check...')
    console.log(`📋 Checking ${contracts.length} contracts:`)

    contracts.forEach((contract, index) => {
        console.log(`  ${index + 1}. EID ${contract.eid}: ${contract.address}`)
    })

    console.log('\n' + '='.repeat(60) + '\n')

    try {
        await checkConfig(contracts)
        console.log('\n✅ Config check completed!')
    } catch (error) {
        console.error('\n❌ Config check failed:', error)
        process.exit(1)
    }
}

// Run the test
if (require.main === module) {
    runCheckConfig().catch(console.error)
}

export { runCheckConfig }
