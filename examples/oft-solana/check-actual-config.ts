import { EndpointId } from '@layerzerolabs/lz-definitions'

import layerzeroConfig from './layerzero.config'

async function checkActualConfig() {
    const config = await layerzeroConfig()

    // Find Solana -> Base connection
    const solanaToBase = config.connections.find(
        (c) => c.from.eid === EndpointId.SOLANA_V2_MAINNET && c.to.eid === EndpointId.BASE_V2_MAINNET
    )

    if (solanaToBase) {
        console.log('Solana -> Base config:')
        console.log('Send config exists:', !!solanaToBase.config?.sendConfig)
        if (solanaToBase.config?.sendConfig?.ulnConfig) {
            const ulnConfig = solanaToBase.config.sendConfig.ulnConfig
            console.log('\nULN Send Config:')
            console.log('- confirmations:', ulnConfig.confirmations?.toString())
            console.log('- requiredDVNCount:', ulnConfig.requiredDVNCount)
            console.log('- requiredDVNs:', ulnConfig.requiredDVNs)
            console.log('- optionalDVNThreshold:', ulnConfig.optionalDVNThreshold)
            console.log('- optionalDVNs:', ulnConfig.optionalDVNs)
        }
    }
}

checkActualConfig().catch(console.error)
