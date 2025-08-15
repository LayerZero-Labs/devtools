import { describe, it } from 'mocha'
import { arbitrumSepolia, baseSepolia } from 'viem/chains'
import { trackOVaultSyncTransaction } from '../../src/oVaultSync'

import 'dotenv/config'

describe('trackOVaultTransaction', function () {
    it('should track a transaction', async function () {
        const txHash = '0xccbe4b23f487afa694c3f23ba783dbb40fd327f17b2892f9f03d5b8ad1718f8a'
        const result = await trackOVaultSyncTransaction(txHash, {
            sourceChain: arbitrumSepolia,
            hubChain: arbitrumSepolia,
            dstChain: baseSepolia,
        })
        console.log(result)
    })
})
