import { TonClient } from 'ton'

describe('TON local node', () => {
    const endpoint = process.env.NETWORK_URL_TON || 'http://localhost:8081/jsonRPC'

    it('should be available', async () => {
        const client = new TonClient({ endpoint })

        await expect(client.getMasterchainInfo()).resolves.toEqual({
            workchain: -1,
            initSeqno: 0,
            latestSeqno: expect.any(Number),
            shard: expect.any(String),
        })
    })
})
