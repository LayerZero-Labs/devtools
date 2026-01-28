import { decodeSuiPrivateKey } from '@mysten/sui/cryptography'
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519'

import { formatEid } from '@layerzerolabs/devtools'
import { ChainType, EndpointId, endpointIdToChainType } from '@layerzerolabs/lz-definitions'

export function getSuiKeypairFromEnv(): Ed25519Keypair {
    const suiPrivateKey = process.env.SUI_PRIVATE_KEY
    if (!suiPrivateKey) {
        throw new Error('SUI_PRIVATE_KEY environment variable is required')
    }

    try {
        const { secretKey } = decodeSuiPrivateKey(suiPrivateKey)
        return Ed25519Keypair.fromSecretKey(secretKey)
    } catch {
        const secretKey = Uint8Array.from(Buffer.from(suiPrivateKey.replace(/^0x/, ''), 'hex'))
        return Ed25519Keypair.fromSecretKey(secretKey)
    }
}

export function assertSuiEid(eid: EndpointId) {
    if (endpointIdToChainType(eid) !== ChainType.SUI) {
        throw new Error(`Expected Sui EID but got ${formatEid(eid)}`)
    }
}
