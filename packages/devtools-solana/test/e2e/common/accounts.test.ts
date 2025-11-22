import { createGetAccountInfo } from '@/common/accounts'
import { ConnectionFactory, createConnectionFactory, createRpcUrlFactory } from '@/connection'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { solanaEndpointArbitrary } from '@layerzerolabs/test-devtools'
import { keypairArbitrary } from '@layerzerolabs/test-devtools-solana'
import { Connection } from '@solana/web3.js'
import fc from 'fast-check'

describe('common/accounts', () => {
    // FIXME These tests are using a mainnet OFT deployment and are potentially very fragile
    //
    // We need to run our own Solana node with the OFT account cloned
    // so that we can isolate these tests
    const oftConfig = { eid: EndpointId.SOLANA_V2_TESTNET, address: 'HvbS7Q8xzSZm8C8rk6dkNNdtozbYsbQuqVBP2CMvNW9p' }

    let connectionFactory: ConnectionFactory
    let getAccountInfoMock: jest.SpyInstance

    beforeAll(() => {
        connectionFactory = createConnectionFactory(
            createRpcUrlFactory({
                [EndpointId.SOLANA_V2_MAINNET]: process.env.RPC_URL_SOLANA_MAINNET,
                [EndpointId.SOLANA_V2_TESTNET]: process.env.RPC_URL_SOLANA_TESTNET,
            })
        )
    })

    beforeEach(() => {
        getAccountInfoMock = jest.spyOn(Connection.prototype, 'getAccountInfo')
    })

    afterEach(() => {
        getAccountInfoMock.mockRestore()
    })

    describe('createGetAccountInfo', () => {
        it('should return account info if the account has been initialized', async () => {
            const connection = await connectionFactory(oftConfig.eid)
            const getAccountInfo = createGetAccountInfo(connection)

            expect(await getAccountInfo(oftConfig.address)).not.toBeUndefined()
        })

        it('should return undefined if the account has not been initialized', async () => {
            getAccountInfoMock.mockResolvedValue(null)

            await fc.assert(
                fc.asyncProperty(solanaEndpointArbitrary, keypairArbitrary, async (eid, keypair) => {
                    fc.pre(eid !== EndpointId.SOLANA_V2_SANDBOX)

                    const address = keypair.publicKey.toBase58()

                    const connection = await connectionFactory(oftConfig.eid)
                    const getAccountInfo = createGetAccountInfo(connection)

                    expect(await getAccountInfo(address)).toBeUndefined()
                })
            )
        })
    })
})
