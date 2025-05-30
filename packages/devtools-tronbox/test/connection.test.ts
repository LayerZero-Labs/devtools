import { createTronWebFactory } from '../src'
import { EndpointId } from '@layerzerolabs/lz-definitions'

describe('connection/factory', () => {
    it('creates a TronWeb instance', async () => {
        const factory = createTronWebFactory(() => 'http://localhost')
        const instance = await factory(EndpointId.TRON_TESTNET)
        expect(instance).toHaveProperty('trx')
    })
})
